import type {
  SchedulingAppointmentState,
  SchedulingOperationalEvent,
} from "./contract";
import { getSchedulingTransition } from "./state-transitions";

export type SchedulingValidationResult = {
  valid: boolean;
  code?: string;
  message?: string;
};

export function validateSchedulingStateTransition(input: {
  currentState: SchedulingAppointmentState;
  event: SchedulingOperationalEvent;
}): SchedulingValidationResult {
  const transition = getSchedulingTransition(input.currentState, input.event);

  if (!transition) {
    return {
      valid: false,
      code: "INVALID_SCHEDULING_STATE_TRANSITION",
      message: `Event "${input.event}" cannot be applied when appointment state is "${input.currentState}".`,
    };
  }

  return {
    valid: true,
  };
}
