import type { SchedulingAgentOperation } from "./contract";
import {
  getSchedulingAgentOperationDefinition,
  type AgentOperationConfirmationPolicy,
  type AgentOperationRiskLevel,
} from "./agent-operations";

export type SchedulingOperationPolicy = {
  operation: SchedulingAgentOperation;
  riskLevel: AgentOperationRiskLevel;
  confirmationPolicy: AgentOperationConfirmationPolicy;
  auditRequired: boolean;
  allowedActorTypes: Array<"user" | "agent" | "system" | "api">;
};

export const schedulingOperationPolicies: SchedulingOperationPolicy[] = [
  {
    operation: "agent_find_available_slots",
    riskLevel: "low",
    confirmationPolicy: "none",
    auditRequired: true,
    allowedActorTypes: ["user", "agent", "system", "api"],
  },
  {
    operation: "agent_create_appointment",
    riskLevel: "medium",
    confirmationPolicy: "recommended",
    auditRequired: true,
    allowedActorTypes: ["user", "agent", "api"],
  },
  {
    operation: "agent_confirm_appointment",
    riskLevel: "medium",
    confirmationPolicy: "recommended",
    auditRequired: true,
    allowedActorTypes: ["user", "agent", "api"],
  },
  {
    operation: "agent_cancel_appointment",
    riskLevel: "high",
    confirmationPolicy: "required",
    auditRequired: true,
    allowedActorTypes: ["user", "agent"],
  },
  {
    operation: "agent_reschedule_appointment",
    riskLevel: "high",
    confirmationPolicy: "required",
    auditRequired: true,
    allowedActorTypes: ["user", "agent"],
  },
  {
    operation: "agent_explain_appointment_status",
    riskLevel: "low",
    confirmationPolicy: "none",
    auditRequired: true,
    allowedActorTypes: ["user", "agent", "system", "api"],
  },
  {
    operation: "agent_suggest_recovery_opportunities",
    riskLevel: "low",
    confirmationPolicy: "none",
    auditRequired: true,
    allowedActorTypes: ["user", "agent", "system"],
  },
];

export function getSchedulingOperationPolicy(
  operation: SchedulingAgentOperation,
) {
  return schedulingOperationPolicies.find(
    (item) => item.operation === operation,
  );
}

export function requiresSchedulingUserConfirmation(
  operation: SchedulingAgentOperation,
) {
  const policy = getSchedulingOperationPolicy(operation);

  if (policy) {
    return policy.confirmationPolicy === "required";
  }

  const definition = getSchedulingAgentOperationDefinition(operation);

  return definition?.confirmationPolicy === "required";
}
