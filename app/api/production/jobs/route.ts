import { NextResponse } from "next/server";
import { getProviderTask, submitProviderJob } from "@/lib/ai/productionProviders";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";
import type { ProductionProvider, ProductionQueueJob } from "@/types/production";

export async function POST(request: Request) {
  try {
    const user = await requireAuthedUser(request);
    const body = await request.json() as { operation?: "submit" | "status"; confirmedCharge?: boolean; job?: ProductionQueueJob; provider?: ProductionProvider; providerJobId?: string };
    if (body.operation === "submit") {
      if (!body.confirmedCharge) return NextResponse.json({ error: "Provider charge confirmation is required." }, { status: 409 });
      if (!body.job || body.job.status !== "ready") return NextResponse.json({ error: "Only reviewed, ready jobs can be submitted." }, { status: 400 });
      return NextResponse.json(await submitProviderJob(body.job, user.uid));
    }
    if (body.operation === "status" && body.provider && body.providerJobId) return NextResponse.json(await getProviderTask(body.provider, body.providerJobId, body.job ? { uid: user.uid, productionId: body.job.productionId, jobId: body.job.id } : undefined));
    return NextResponse.json({ error: "Invalid production operation." }, { status: 400 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Provider request failed." }, { status: 502 });
  }
}
