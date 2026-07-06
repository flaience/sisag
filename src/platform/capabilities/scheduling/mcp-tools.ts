import type { SchedulingAgentOperation } from "./contract";
import {
  getSchedulingOperationPolicy,
  requiresSchedulingUserConfirmation,
} from "./policies";

export type SchedulingMcpTool = {
  name: string;
  operation: SchedulingAgentOperation;
  description: string;
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  auditRequired: boolean;
};

export const schedulingMcpTools: SchedulingMcpTool[] = [
  {
    name: "scheduling.find_available_slots",
    operation: "agent_find_available_slots",
    description:
      "Find available scheduling slots based on operational context and constraints.",
    riskLevel: "low",
    requiresConfirmation: false,
    auditRequired: true,
  },
  {
    name: "scheduling.create_appointment",
    operation: "agent_create_appointment",
    description:
      "Create an appointment after validating client, service, availability and operational rules.",
    riskLevel: "medium",
    requiresConfirmation: false,
    auditRequired: true,
  },
  {
    name: "scheduling.confirm_appointment",
    operation: "agent_confirm_appointment",
    description: "Confirm an existing appointment.",
    riskLevel: "medium",
    requiresConfirmation: false,
    auditRequired: true,
  },
  {
    name: "scheduling.cancel_appointment",
    operation: "agent_cancel_appointment",
    description:
      "Cancel an appointment while preserving traceability and cancellation reason.",
    riskLevel: "high",
    requiresConfirmation: true,
    auditRequired: true,
  },
  {
    name: "scheduling.reschedule_appointment",
    operation: "agent_reschedule_appointment",
    description:
      "Move an appointment to another valid slot while preserving operational journey.",
    riskLevel: "high",
    requiresConfirmation: true,
    auditRequired: true,
  },
  {
    name: "scheduling.explain_appointment_status",
    operation: "agent_explain_appointment_status",
    description:
      "Explain the current appointment status using operational events and context.",
    riskLevel: "low",
    requiresConfirmation: false,
    auditRequired: true,
  },
  {
    name: "scheduling.suggest_recovery_opportunities",
    operation: "agent_suggest_recovery_opportunities",
    description:
      "Identify recovery opportunities from cancellations, no-shows or unused availability.",
    riskLevel: "low",
    requiresConfirmation: false,
    auditRequired: true,
  },
];

export function getSchedulingMcpTool(name: string) {
  return schedulingMcpTools.find((tool) => tool.name === name);
}

export function validateSchedulingMcpToolPolicy(tool: SchedulingMcpTool) {
  const policy = getSchedulingOperationPolicy(tool.operation);

  if (!policy) {
    return {
      valid: false,
      code: "SCHEDULING_OPERATION_POLICY_NOT_FOUND",
      message: `No policy was found for operation "${tool.operation}".`,
    };
  }

  const requiresConfirmation = requiresSchedulingUserConfirmation(
    tool.operation,
  );

  if (tool.requiresConfirmation !== requiresConfirmation) {
    return {
      valid: false,
      code: "SCHEDULING_MCP_TOOL_CONFIRMATION_POLICY_MISMATCH",
      message: `Tool "${tool.name}" confirmation policy does not match scheduling policy.`,
    };
  }

  if (tool.auditRequired !== policy.auditRequired) {
    return {
      valid: false,
      code: "SCHEDULING_MCP_TOOL_AUDIT_POLICY_MISMATCH",
      message: `Tool "${tool.name}" audit policy does not match scheduling policy.`,
    };
  }

  return {
    valid: true,
  };
}
