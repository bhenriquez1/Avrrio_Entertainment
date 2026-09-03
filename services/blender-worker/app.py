import asyncio
import json
import os
import secrets
import shutil
import signal
import time
import uuid
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

RENDER_ROOT = Path("/tmp/avrrio-renders")
RENDER_ROOT.mkdir(parents=True, exist_ok=True)
WORKER_TOKEN = os.environ.get("BLENDER_WORKER_TOKEN", "")
MAX_JOBS = int(os.environ.get("BLENDER_MAX_JOBS", "1"))
JOB_TTL_SECONDS = int(os.environ.get("BLENDER_JOB_TTL_SECONDS", "21600"))

app = FastAPI(title="Avrrio Blender Worker", docs_url=None, redoc_url=None)
jobs: dict[str, dict] = {}
semaphore = asyncio.Semaphore(MAX_JOBS)
shutting_down = False


class SceneObject(BaseModel):
    kind: Literal["cube", "sphere", "cylinder", "cone", "text"] = "cube"
    name: str = Field(default="Object", max_length=80)
    location: tuple[float, float, float] = (0.0, 0.0, 0.0)
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0)
    color: tuple[float, float, float, float] = (0.2, 0.4, 0.8, 1.0)
    text: str | None = Field(default=None, max_length=240)


class RenderRequest(BaseModel):
    production_id: str = Field(min_length=1, max_length=120)
    scene_id: str | None = Field(default=None, max_length=120)
    title: str = Field(default="Avrrio Scene", max_length=160)
    width: int = Field(default=1280, ge=320, le=1920)
    height: int = Field(default=720, ge=240, le=1080)
    samples: int = Field(default=32, ge=1, le=128)
    objects: list[SceneObject] = Field(default_factory=list, max_length=100)


def require_token(authorization: str | None = Header(default=None)) -> None:
    if not WORKER_TOKEN:
        raise HTTPException(status_code=503, detail="Worker token is not configured")
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    if not secrets.compare_digest(supplied, WORKER_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health():
    return {"ok": True, "acceptingJobs": not shutting_down}


@app.post("/jobs", status_code=202, dependencies=[Depends(require_token)])
async def create_job(request: RenderRequest):
    if shutting_down:
        raise HTTPException(status_code=503, detail="Worker is shutting down")
    job_id = uuid.uuid4().hex
    job_dir = RENDER_ROOT / job_id
    job_dir.mkdir(mode=0o700)
    spec_path = job_dir / "scene.json"
    spec_path.write_text(json.dumps(request.model_dump()), encoding="utf-8")
    jobs[job_id] = {"id": job_id, "status": "queued", "createdAt": time.time(), "error": None}
    asyncio.create_task(run_render(job_id, spec_path, job_dir / "render.png"))
    return public_job(job_id)


@app.get("/jobs/{job_id}", dependencies=[Depends(require_token)])
async def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return public_job(job_id)


@app.get("/jobs/{job_id}/artifact", dependencies=[Depends(require_token)])
async def get_artifact(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "complete":
        raise HTTPException(status_code=409, detail="Artifact is not ready")
    path = RENDER_ROOT / job_id / "render.png"
    return FileResponse(path, media_type="image/png", filename=f"avrrio-{job_id}.png")


def public_job(job_id: str):
    job = jobs[job_id]
    return {
        "id": job_id,
        "status": job["status"],
        "error": job["error"],
        "artifactPath": f"/jobs/{job_id}/artifact" if job["status"] == "complete" else None,
    }


async def run_render(job_id: str, spec_path: Path, output_path: Path):
    async with semaphore:
        jobs[job_id]["status"] = "running"
        try:
            process = await asyncio.create_subprocess_exec(
                "blender", "--background", "--python", "/app/render_scene.py", "--",
                str(spec_path), str(output_path),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=900)
            if process.returncode != 0 or not output_path.exists():
                message = stderr.decode("utf-8", errors="replace")[-1200:]
                raise RuntimeError(message or "Blender exited without an artifact")
            jobs[job_id]["status"] = "complete"
        except Exception as error:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(error)[:1200]


async def cleanup_loop():
    while True:
        await asyncio.sleep(600)
        cutoff = time.time() - JOB_TTL_SECONDS
        for job_id, job in list(jobs.items()):
            if job["createdAt"] < cutoff and job["status"] not in {"queued", "running"}:
                shutil.rmtree(RENDER_ROOT / job_id, ignore_errors=True)
                jobs.pop(job_id, None)


@app.on_event("startup")
async def startup():
    asyncio.create_task(cleanup_loop())


def begin_shutdown(*_):
    global shutting_down
    shutting_down = True


signal.signal(signal.SIGTERM, begin_shutdown)

