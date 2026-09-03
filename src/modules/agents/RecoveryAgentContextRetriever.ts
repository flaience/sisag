export const RECOVERY_AGENT_CONTEXT_VERSION = "recovery_context_v1";
export const RECOVERY_AGENT_CONTEXT_MAX_CHARS = 4000;

export type RecoveryContextSource = "recovery_case" | "latest_response" | "booking";
export type RecoveryAgentContextSnapshot = {
  version: typeof RECOVERY_AGENT_CONTEXT_VERSION;
  sources: RecoveryContextSource[];
  generatedAt: string;
  recovery: { score: number; priority: string; classification: string | null; slaEscalated: boolean; assigned: boolean; caseAgeMinutes: number; responseAgeMinutes: number | null };
  booking: { status: string; startTime: string; source: string };
};

export type RecoveryAgentContextRecord = {
  companyId: string;
  recordCompanyId: string;
  score: number;
  priority: string;
  classification: string | null;
  slaEscalated: boolean;
  assigned: boolean;
  caseAgeMinutes: number;
  responseAgeMinutes: number | null;
  bookingStatus: string;
  bookingStartTime: Date;
  bookingSource: string;
};

export interface RecoveryAgentContextRetriever { retrieve(input: RecoveryAgentContextRecord, now?: Date): Promise<{ ok: true; snapshot: RecoveryAgentContextSnapshot } | { ok: false; errorCode: "context_tenant_mismatch" | "context_too_large" }> }

export class SisagRecoveryAgentContextRetriever implements RecoveryAgentContextRetriever {
  async retrieve(input: RecoveryAgentContextRecord, now = new Date()) {
    if (input.companyId !== input.recordCompanyId) return { ok: false as const, errorCode: "context_tenant_mismatch" as const };
    const snapshot: RecoveryAgentContextSnapshot = {
      version: RECOVERY_AGENT_CONTEXT_VERSION,
      sources: ["recovery_case", ...(input.classification ? ["latest_response" as const] : []), "booking"],
      generatedAt: now.toISOString(),
      recovery: { score: input.score, priority: input.priority, classification: input.classification, slaEscalated: input.slaEscalated, assigned: input.assigned, caseAgeMinutes: input.caseAgeMinutes, responseAgeMinutes: input.responseAgeMinutes },
      booking: { status: input.bookingStatus, startTime: input.bookingStartTime.toISOString(), source: input.bookingSource },
    };
    if (JSON.stringify(snapshot).length > RECOVERY_AGENT_CONTEXT_MAX_CHARS) return { ok: false as const, errorCode: "context_too_large" as const };
    return { ok: true as const, snapshot };
  }
}
