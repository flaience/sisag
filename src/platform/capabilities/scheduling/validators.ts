import type { PlatformResult } from "@/platform/core/types";
import type {
  SchedulingAppointmentState,
  SchedulingOperationalEvent,
} from "./contract";
import type { SchedulingErrorCode } from "./errors";
import { getSchedulingTransition } from "./state-transitions";

export type SchedulingValidationError = {
  code: SchedulingErrorCode;
  message: string;
};

export function validateSchedulingStateTransition(input: {
  currentState: SchedulingAppointmentState;
  event: SchedulingOperationalEvent;
}): PlatformResult<true, SchedulingValidationError> {
  const transition = getSchedulingTransition(input.currentState, input.event);

  if (!transition) {
    return {
      ok: false,
      error: {
        code: "SCHEDULING_INVALID_STATE_TRANSITION",
        message: `Event "${input.event}" cannot be applied when appointment state is "${input.currentState}".`,
      },
    };
  }

  return {
    ok: true,
    value: true,
  };
}
