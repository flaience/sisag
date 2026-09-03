import { RecoveryAgentDecisionJsonSchema, RecoveryAgentDecisionSchema, type RecoveryAgentDecision } from "./RecoveryAgentDecision.schema";
import { recommendRecoveryAction, type RecoveryRecommendationInput } from "@/modules/automation/BookingRecoveryRecommendation.rules";

export type AgentProviderRequest = { system: string; input: unknown; schemaName: string; jsonSchema: Record<string, unknown>; timeoutMs: number };
export type AgentProviderResponse = { output: unknown; model: string; inputTokens?: number; outputTokens?: number };
export interface RecoveryAgentProvider { complete(request: AgentProviderRequest): Promise<AgentProviderResponse> }
export type RecoveryAgentContext = RecoveryRecommendationInput & { caseAgeMinutes: number; responseAgeMinutes: number | null };
export const RECOVERY_AGENT_PROMPT_VERSION = "recovery_decision_v1";

export function buildRecoveryAgentPrompt() {
  return "Analise somente os sinais fornecidos. Recomende uma ação operacional para revisão humana. Não envie mensagens, não prometa benefícios, não invente fatos e responda estritamente no esquema solicitado.";
}

function fallback(context: RecoveryAgentContext, errorCode: string, durationMs: number, provider: string | null, model: string | null) {
  const base = recommendRecoveryAction(context);
  return { decision: { ...base, signals: ["deterministic_fallback", errorCode] } as RecoveryAgentDecision, execution: { mode: "fallback" as const, provider, model, fallbackEngine: "recovery_rules_v1", promptVersion: RECOVERY_AGENT_PROMPT_VERSION, inputTokens: 0, outputTokens: 0, durationMs, errorCode } };
}

function normalizeProviderError(error: unknown) {
  return error instanceof Error && error.message === "provider_timeout" ? "provider_timeout" : "provider_error";
}

function normalizeTokens(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value!)) : 0;
}

export async function executeRecoveryAgent(input: { context: RecoveryAgentContext; provider?: RecoveryAgentProvider; providerName?: string; timeoutMs?: number }) {
  const startedAt = Date.now();
  if (!input.provider) return fallback(input.context, "provider_not_configured", Date.now() - startedAt, null, null);
  const requestedTimeout = Number.isFinite(input.timeoutMs) ? input.timeoutMs! : 8000;
  const timeoutMs = Math.min(Math.max(requestedTimeout, 1000), 20000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs); });
    const response = await Promise.race([input.provider.complete({ system: buildRecoveryAgentPrompt(), input: input.context, schemaName: "recovery_agent_decision", jsonSchema: RecoveryAgentDecisionJsonSchema, timeoutMs }), timeout]);
    const parsed = RecoveryAgentDecisionSchema.safeParse(response.output);
    if (!parsed.success) return fallback(input.context, "invalid_structured_output", Date.now() - startedAt, input.providerName ?? "configured", response.model);
    return { decision: parsed.data, execution: { mode: "ai" as const, provider: input.providerName ?? "configured", model: response.model, fallbackEngine: null, promptVersion: RECOVERY_AGENT_PROMPT_VERSION, inputTokens: normalizeTokens(response.inputTokens), outputTokens: normalizeTokens(response.outputTokens), durationMs: Date.now() - startedAt, errorCode: null } };
  } catch (error) {
    return fallback(input.context, normalizeProviderError(error), Date.now() - startedAt, input.providerName ?? "configured", null);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
