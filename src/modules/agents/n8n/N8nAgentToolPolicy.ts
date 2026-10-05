export const N8N_AGENT_TOOL_POLICY_VERSION = "n8n_agent_tools_v1" as const;

export const n8nAgentReadOnlyTools = [
  "scheduling.find_available_slots",
  "scheduling.explain_appointment_status",
] as const;

export const n8nAgentMutationTools = [
  "scheduling.create_appointment",
  "scheduling.confirm_appointment",
  "scheduling.cancel_appointment",
  "scheduling.reschedule_appointment",
] as const;

export function evaluateN8nAgentTool(name: string) {
  if ((n8nAgentReadOnlyTools as readonly string[]).includes(name)) {
    return { allowed: true, execution: "read_only" as const, requiresConfirmation: false };
  }
  if ((n8nAgentMutationTools as readonly string[]).includes(name)) {
    return { allowed: false, execution: "disabled" as const, requiresConfirmation: true, reason: "mutation_not_enabled" as const };
  }
  return { allowed: false, execution: "disabled" as const, requiresConfirmation: false, reason: "tool_not_allowlisted" as const };
}
