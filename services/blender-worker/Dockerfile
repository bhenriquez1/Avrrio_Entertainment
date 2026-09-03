FROM debian:bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

RUN apt-get update \
    && apt-get install -y --no-install-recommends blender python3 python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY app.py render_scene.py ./

RUN useradd --create-home --uid 10001 renderer \
    && mkdir -p /tmp/avrrio-renders \
    && chown -R renderer:renderer /app /tmp/avrrio-renders
USER renderer

EXPOSE 10000
CMD ["/bin/sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT}"]

