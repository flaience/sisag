//src/platform/capabilities/scheduling/index.ts
export { schedulingCapabilityContract } from "./contract";

export type {
  SchedulingAgentOperation,
  SchedulingAppointmentState,
  SchedulingCapabilityContract,
  SchedulingCapabilityName,
  SchedulingOperationalEvent,
  SchedulingOperationalObject,
  SchedulingPublicOperation,
} from "./contract";

export {
  getSchedulingAgentOperationDefinition,
  schedulingAgentOperations,
} from "./agent-operations";

export type {
  AgentOperationConfirmationPolicy,
  AgentOperationRiskLevel,
  SchedulingAgentOperationDefinition,
} from "./agent-operations";

export type {
  SchedulingAgentAuditActor,
  SchedulingAgentAuditDraft,
  SchedulingAgentAuditEntry,
  SchedulingAgentAuditTarget,
} from "./audit";
export { schedulingOperationDefinitions } from "./operations";

export type {
  AppointmentSummary,
  AvailableSlot,
  CancelAppointmentInput,
  CompleteAppointmentInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  FindAvailableSlotsInput,
  ListAppointmentsInput,
  RescheduleAppointmentInput,
  SchedulingOperationActor,
  SchedulingOperationContext,
  SchedulingOperationDefinition,
  SchedulingOperationResult,
  SchedulingOperationsPort,
} from "./operations";

export {
  getSchedulingEventDefinition,
  schedulingEventDefinitions,
} from "./events";

export type { SchedulingEventDefinition } from "./events";

export {
  canApplySchedulingEvent,
  getSchedulingTransition,
  schedulingStateTransitions,
} from "./state-transitions";

export type { SchedulingStateTransition } from "./state-transitions";

export { validateSchedulingStateTransition } from "./validators";

export type { SchedulingValidationError } from "./validators";

export {
  getSchedulingErrorDefinition,
  schedulingErrorDefinitions,
} from "./errors";

export type { SchedulingErrorCode, SchedulingErrorDefinition } from "./errors";

export {
  getSchedulingOperationPolicy,
  requiresSchedulingUserConfirmation,
  schedulingOperationPolicies,
} from "./policies";

export type { SchedulingOperationPolicy } from "./policies";

export {
  getSchedulingMcpTool,
  schedulingMcpTools,
  validateSchedulingMcpToolPolicy,
} from "./mcp-tools";

export type { SchedulingMcpTool } from "./mcp-tools";

export { validateSchedulingMcpTools } from "./mcp-tools-validator";

export type { SchedulingMcpToolsValidationResult } from "./mcp-tools-validator";

export { validateSchedulingCapability } from "./validate-capability";

export type { SchedulingCapabilityValidationResult } from "./validate-capability";

export { selfCheckSchedulingCapability } from "./self-check";

export { SisagSchedulingAdapter } from "./adapters";
