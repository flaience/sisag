import { and, desc, eq } from "drizzle-orm";
import { n8nAgentShadowMirrorObservations } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { N8N_AGENT_FOUNDATION_VERSION } from "./N8nAgentFoundation.contract";
import type { N8nAgentShadowDecisionMetadata, N8nAgentShadowExecutionMetadata } from "./N8nAgentShadowMirrorResponse.schema";

export type ShadowMirrorStatus = "accepted" | "rejected" | "transport_failed" | "configuration_error";

export function classifyN8nAgentShadowMirrorResult(result: { ok: boolean; error?: string }): ShadowMirrorStatus {
  if (result.ok) return "accepted";
  if (result.error === "shadow_webhook_rejected") return "rejected";
  if (result.error === "shadow_transport_failed") return "transport_failed";
  return "configuration_error";
}

export class N8nAgentShadowMirrorObservationService {
  static async record(input: { companyId: string; correlationId: string; status: ShadowMirrorStatus; durationMs: number; decision?: N8nAgentShadowDecisionMetadata | null; execution?: N8nAgentShadowExecutionMetadata | null; observedAt?: Date }) {
    const observedAt = input.observedAt ?? new Date();
    const values = {
      companyId: input.companyId,
      correlationId: input.correlationId,
      status: input.status,
      durationMs: Math.min(30_000, Math.max(0, Math.trunc(input.durationMs))),
      policyVersion: N8N_AGENT_FOUNDATION_VERSION,
      decisionAction: input.decision?.action ?? null,
      toolName: input.decision?.toolName ?? null,
      reasonCode: input.decision?.reasonCode ?? null,
      confidenceMilli: input.decision ? Math.round(input.decision.confidence * 1000) : null,
      executionMode: input.execution?.mode ?? null,
      provider: input.execution?.provider ?? null,
      model: input.execution?.model ?? null,
      promptVersion: input.execution?.promptVersion ?? null,
      modelDurationMs: input.execution?.durationMs ?? null,
      modelErrorCode: input.execution?.errorCode ?? null,
      observedAt,
    };
    await getDb().insert(n8nAgentShadowMirrorObservations).values(values).onConflictDoUpdate({
      target: [n8nAgentShadowMirrorObservations.companyId, n8nAgentShadowMirrorObservations.correlationId],
      set: { status: values.status, durationMs: values.durationMs, policyVersion: values.policyVersion, decisionAction: values.decisionAction, toolName: values.toolName, reasonCode: values.reasonCode, confidenceMilli: values.confidenceMilli, executionMode: values.executionMode, provider: values.provider, model: values.model, promptVersion: values.promptVersion, modelDurationMs: values.modelDurationMs, modelErrorCode: values.modelErrorCode, observedAt },
    });
  }

  static async list(input: { companyId: string; limit?: number; correlationId?: string | null }) {
    const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 20)));
    const where = input.correlationId
      ? and(eq(n8nAgentShadowMirrorObservations.companyId, input.companyId), eq(n8nAgentShadowMirrorObservations.correlationId, input.correlationId))
      : eq(n8nAgentShadowMirrorObservations.companyId, input.companyId);
    return getDb().select({
      correlationId: n8nAgentShadowMirrorObservations.correlationId,
      status: n8nAgentShadowMirrorObservations.status,
      durationMs: n8nAgentShadowMirrorObservations.durationMs,
      policyVersion: n8nAgentShadowMirrorObservations.policyVersion,
      decisionAction: n8nAgentShadowMirrorObservations.decisionAction,
      toolName: n8nAgentShadowMirrorObservations.toolName,
      reasonCode: n8nAgentShadowMirrorObservations.reasonCode,
      confidenceMilli: n8nAgentShadowMirrorObservations.confidenceMilli,
      executionMode: n8nAgentShadowMirrorObservations.executionMode,
      provider: n8nAgentShadowMirrorObservations.provider,
      model: n8nAgentShadowMirrorObservations.model,
      promptVersion: n8nAgentShadowMirrorObservations.promptVersion,
      modelDurationMs: n8nAgentShadowMirrorObservations.modelDurationMs,
      modelErrorCode: n8nAgentShadowMirrorObservations.modelErrorCode,
      observedAt: n8nAgentShadowMirrorObservations.observedAt,
    }).from(n8nAgentShadowMirrorObservations).where(where).orderBy(desc(n8nAgentShadowMirrorObservations.observedAt)).limit(limit);
  }
}
