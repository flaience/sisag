//src/platform/capabilities/scheduling/self-check.ts
import {
  schedulingCapabilityContract,
  schedulingAgentOperations,
  schedulingErrorDefinitions,
  schedulingEventDefinitions,
  schedulingMcpTools,
  schedulingOperationDefinitions,
  schedulingOperationPolicies,
  schedulingStateTransitions,
  validateSchedulingCapability,
} from "./index";

export function selfCheckSchedulingCapability() {
  return {
    contract: schedulingCapabilityContract.name,
    agentOperations: schedulingAgentOperations.length,
    errors: schedulingErrorDefinitions.length,
    events: schedulingEventDefinitions.length,
    mcpTools: schedulingMcpTools.length,
    operations: schedulingOperationDefinitions.length,
    policies: schedulingOperationPolicies.length,
    transitions: schedulingStateTransitions.length,
    validation: validateSchedulingCapability(),
  };
}
