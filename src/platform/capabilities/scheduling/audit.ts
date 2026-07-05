import type { SchedulingAgentOperation } from "./contract";

export type SchedulingAgentAuditActor = {
  type: "user" | "agent" | "system";
  id: string;
  name?: string | null;
};

export type SchedulingAgentAuditTarget = {
  type:
    | "appointment"
    | "availability"
    | "client"
    | "professional"
    | "resource"
    | "service";
  id?: string | null;
  label?: string | null;
};

export type SchedulingAgentAuditEntry = {
  id: string;
  companyId: string;
  operation: SchedulingAgentOperation;
  actor: SchedulingAgentAuditActor;
  target?: SchedulingAgentAuditTarget | null;
  reason?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  riskLevel: "low" | "medium" | "high";
  confirmationPolicy: "none" | "recommended" | "required";
  confirmedByUserId?: string | null;
  createdAt: string;
};

export type SchedulingAgentAuditDraft = Omit<
  SchedulingAgentAuditEntry,
  "id" | "createdAt"
>;
