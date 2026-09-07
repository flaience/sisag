import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { RecoveryRetrievalExperimentEvaluationSchema } from "@/modules/agents/RecoveryRetrievalExperimentEvaluation.schema";
import { RecoveryRetrievalExperimentEvaluationService } from "@/modules/agents/RecoveryRetrievalExperimentEvaluation.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner"]);
  if (auth.ok === false) return auth.response;
  return NextResponse.json(await RecoveryRetrievalExperimentEvaluationService.list({ companyId: auth.auth.companyId }));
}

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner"]);
  if (auth.ok === false) return auth.response;
  const parsed = RecoveryRetrievalExperimentEvaluationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  const result = await RecoveryRetrievalExperimentEvaluationService.create({ companyId: auth.auth.companyId, actorId: auth.auth.userId, evaluation: parsed.data });
  if (result.ok) return NextResponse.json(result, { status: 201 });
  return NextResponse.json(result, { status: result.error === "stopped_experiment_not_found" ? 404 : 409 });
}
