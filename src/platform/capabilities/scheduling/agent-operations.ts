import type { SchedulingAgentOperation } from "./contract";

export type AgentOperationRiskLevel = "low" | "medium" | "high";

export type AgentOperationConfirmationPolicy =
  | "none"
  | "recommended"
  | "required";

export type SchedulingAgentOperationDefinition = {
  operation: SchedulingAgentOperation;
  description: string;
  riskLevel: AgentOperationRiskLevel;
  confirmationPolicy: AgentOperationConfirmationPolicy;
  auditRequired: boolean;
};

export const schedulingAgentOperations: SchedulingAgentOperationDefinition[] = [
  {
    operation: "agent_find_available_slots",
    description:
      "Allows an operational agent to search available scheduling slots based on context, constraints and availability.",
    riskLevel: "low",
    confirmationPolicy: "none",
    auditRequired: true,
  },
  {
    operation: "agent_create_appointment",
    description:
      "Allows an operational agent to create an appointment after validating client, service, availability and operational rules.",
    riskLevel: "medium",
    confirmationPolicy: "recommended",
    auditRequired: true,
  },
  {
    operation: "agent_confirm_appointment",
    description:
      "Allows an operational agent to confirm an existing appointment.",
    riskLevel: "medium",
    confirmationPolicy: "recommended",
    auditRequired: true,
  },
  {
    operation: "agent_cancel_appointment",
    description:
      "Allows an operational agent to cancel an appointment while preserving traceability and reason when available.",
    riskLevel: "high",
    confirmationPolicy: "required",
    auditRequired: true,
  },
  {
    operation: "agent_reschedule_appointment",
    description:
      "Allows an operational agent to move an appointment to another valid slot, preserving the operational journey.",
    riskLevel: "high",
    confirmationPolicy: "required",
    auditRequired: true,
  },
  {
    operation: "agent_explain_appointment_status",
    description:
      "Allows an operational agent to explain the current appointment status based on operational events and context.",
    riskLevel: "low",
    confirmationPolicy: "none",
    auditRequired: true,
  },
  {
    operation: "agent_suggest_recovery_opportunities",
    description:
      "Allows an operational agent to identify opportunities created by cancellations, no-shows or unused availability.",
    riskLevel: "low",
    confirmationPolicy: "none",
    auditRequired: true,
  },
];

export function getSchedulingAgentOperationDefinition(
  operation: SchedulingAgentOperation,
) {
  return schedulingAgentOperations.find((item) => item.operation === operation);
}
