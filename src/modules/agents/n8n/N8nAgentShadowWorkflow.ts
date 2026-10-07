export const N8N_AGENT_SHADOW_WORKFLOW = {
  version: "n8n_agent_shadow_v1",
  file: "automation/n8n/workflows/sisag-agent-shadow-v1.json",
  mode: "shadow",
  activeByDefault: false,
  allowedGatewayPath: "/api/platform/agents/n8n/read-only",
  sideEffects: "none",
} as const;
