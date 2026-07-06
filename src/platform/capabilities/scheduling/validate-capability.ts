import { schedulingCapabilityContract } from "./contract";
import { schedulingAgentOperations } from "./agent-operations";
import { schedulingEventDefinitions } from "./events";
import { schedulingMcpTools } from "./mcp-tools";
import { validateSchedulingMcpTools } from "./mcp-tools-validator";
import { schedulingOperationDefinitions } from "./operations";
import { schedulingOperationPolicies } from "./policies";
import { schedulingStateTransitions } from "./state-transitions";

export type SchedulingCapabilityValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateSchedulingCapability(): SchedulingCapabilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const contractEvents = new Set(
    schedulingCapabilityContract.operationalEvents,
  );
  const contractAgentOperations = new Set(
    schedulingCapabilityContract.agentOperations,
  );
  const contractPublicOperations = new Set(
    schedulingCapabilityContract.publicOperations,
  );

  for (const eventDefinition of schedulingEventDefinitions) {
    if (!contractEvents.has(eventDefinition.event)) {
      errors.push(
        `Event "${eventDefinition.event}" is defined but not declared in the scheduling capability contract.`,
      );
    }
  }

  for (const transition of schedulingStateTransitions) {
    if (!contractEvents.has(transition.event)) {
      errors.push(
        `Transition event "${transition.event}" is not declared in the scheduling capability contract.`,
      );
    }
  }

  for (const operationDefinition of schedulingOperationDefinitions) {
    if (!contractPublicOperations.has(operationDefinition.operation)) {
      errors.push(
        `Public operation "${operationDefinition.operation}" is defined but not declared in the scheduling capability contract.`,
      );
    }

    for (const emittedEvent of operationDefinition.emits) {
      if (!contractEvents.has(emittedEvent)) {
        errors.push(
          `Public operation "${operationDefinition.operation}" emits unknown event "${emittedEvent}".`,
        );
      }
    }
  }

  for (const agentOperation of schedulingAgentOperations) {
    if (!contractAgentOperations.has(agentOperation.operation)) {
      errors.push(
        `Agent operation "${agentOperation.operation}" is defined but not declared in the scheduling capability contract.`,
      );
    }
  }

  for (const policy of schedulingOperationPolicies) {
    if (!contractAgentOperations.has(policy.operation)) {
      errors.push(
        `Policy for operation "${policy.operation}" exists but operation is not declared in the scheduling capability contract.`,
      );
    }
  }

  for (const tool of schedulingMcpTools) {
    if (!contractAgentOperations.has(tool.operation)) {
      errors.push(
        `MCP tool "${tool.name}" references operation "${tool.operation}" that is not declared in the scheduling capability contract.`,
      );
    }
  }

  const mcpValidation = validateSchedulingMcpTools();

  for (const error of mcpValidation.errors) {
    errors.push(`[${error.tool}] ${error.code}: ${error.message}`);
  }

  if (schedulingCapabilityContract.guarantees.length === 0) {
    warnings.push("Scheduling capability has no guarantees.");
  }

  if (schedulingCapabilityContract.constraints.length === 0) {
    warnings.push("Scheduling capability has no constraints.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
