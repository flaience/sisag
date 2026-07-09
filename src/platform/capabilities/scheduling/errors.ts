//src/platform/capabilities/scheduling/errors.ts
export type SchedulingErrorCode =
  | "SCHEDULING_INVALID_STATE_TRANSITION"
  | "SCHEDULING_CONFLICT_PROFESSIONAL"
  | "SCHEDULING_CONFLICT_RESOURCE"
  | "SCHEDULING_APPOINTMENT_NOT_FOUND"
  | "SCHEDULING_CLIENT_NOT_FOUND"
  | "SCHEDULING_SERVICE_NOT_FOUND"
  | "SCHEDULING_PROFESSIONAL_NOT_FOUND"
  | "SCHEDULING_RESOURCE_NOT_FOUND"
  | "SCHEDULING_AVAILABILITY_NOT_FOUND"
  | "SCHEDULING_OPERATION_NOT_ALLOWED"
  | "SCHEDULING_AGENT_CONFIRMATION_REQUIRED"
  | "SCHEDULING_UNKNOWN_ERROR";

export type SchedulingErrorDefinition = {
  code: SchedulingErrorCode;
  message: string;
  recoverable: boolean;
};

export const schedulingErrorDefinitions: SchedulingErrorDefinition[] = [
  {
    code: "SCHEDULING_INVALID_STATE_TRANSITION",
    message: "The requested scheduling state transition is not allowed.",
    recoverable: false,
  },
  {
    code: "SCHEDULING_CONFLICT_PROFESSIONAL",
    message: "The selected professional is not available for this time range.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_CONFLICT_RESOURCE",
    message: "The selected resource is not available for this time range.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
    message: "The appointment could not be found.",
    recoverable: false,
  },
  {
    code: "SCHEDULING_CLIENT_NOT_FOUND",
    message: "The client could not be found.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_SERVICE_NOT_FOUND",
    message: "The service could not be found.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_PROFESSIONAL_NOT_FOUND",
    message: "The professional could not be found.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_RESOURCE_NOT_FOUND",
    message: "The resource could not be found.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_AVAILABILITY_NOT_FOUND",
    message: "No availability was found for the requested criteria.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_OPERATION_NOT_ALLOWED",
    message: "The scheduling operation is not allowed in this context.",
    recoverable: false,
  },
  {
    code: "SCHEDULING_AGENT_CONFIRMATION_REQUIRED",
    message: "This agent operation requires explicit user confirmation.",
    recoverable: true,
  },
  {
    code: "SCHEDULING_UNKNOWN_ERROR",
    message: "An unknown scheduling error occurred.",
    recoverable: false,
  },
];

export function getSchedulingErrorDefinition(code: SchedulingErrorCode) {
  return schedulingErrorDefinitions.find((item) => item.code === code);
}
