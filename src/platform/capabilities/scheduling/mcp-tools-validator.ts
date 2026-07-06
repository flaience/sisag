import {
  schedulingMcpTools,
  validateSchedulingMcpToolPolicy,
} from "./mcp-tools";

export type SchedulingMcpToolsValidationResult = {
  valid: boolean;
  errors: Array<{
    tool: string;
    code: string;
    message: string;
  }>;
};

export function validateSchedulingMcpTools(): SchedulingMcpToolsValidationResult {
  const errors: SchedulingMcpToolsValidationResult["errors"] = [];

  for (const tool of schedulingMcpTools) {
    const result = validateSchedulingMcpToolPolicy(tool);

    if (!result.valid) {
      errors.push({
        tool: tool.name,
        code: result.code ?? "SCHEDULING_MCP_TOOL_INVALID",
        message: result.message ?? "Invalid scheduling MCP tool.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
