import type {
  SchedulingAppointmentState,
  SchedulingOperationalEvent,
} from "./contract";

export type SchedulingEventDefinition = {
  event: SchedulingOperationalEvent;
  description: string;
  resultingState?: SchedulingAppointmentState;
  critical: boolean;
};

export const schedulingEventDefinitions: SchedulingEventDefinition[] = [
  {
    event: "appointment.requested",
    description: "A scheduling request was initiated.",
    resultingState: "requested",
    critical: false,
  },
  {
    event: "appointment.created",
    description: "An appointment was created.",
    resultingState: "pending",
    critical: true,
  },
  {
    event: "appointment.confirmed",
    description: "An appointment was confirmed.",
    resultingState: "confirmed",
    critical: true,
  },
  {
    event: "appointment.rescheduled",
    description:
      "An appointment was moved to another valid slot while preserving its lifecycle state.",
    critical: true,
  },
  {
    event: "appointment.cancelled",
    description: "An appointment was cancelled.",
    resultingState: "cancelled",
    critical: true,
  },
  {
    event: "appointment.completed",
    description: "The scheduled service was completed.",
    resultingState: "completed",
    critical: true,
  },
  {
    event: "appointment.expired",
    description: "The appointment expired without confirmation or execution.",
    resultingState: "expired",
    critical: false,
  },
  {
    event: "appointment.no_show",
    description: "The client did not attend the scheduled appointment.",
    resultingState: "no_show",
    critical: true,
  },
  {
    event: "availability.generated",
    description: "Available slots were generated for scheduling.",
    critical: false,
  },
  {
    event: "availability.blocked",
    description: "Availability was blocked for a professional or resource.",
    critical: true,
  },
  {
    event: "reminder.scheduled",
    description: "A reminder was scheduled.",
    critical: false,
  },
  {
    event: "reminder.sent",
    description: "A reminder was sent.",
    critical: false,
  },
  {
    event: "communication.sent",
    description: "A communication was sent.",
    critical: false,
  },
  {
    event: "communication.failed",
    description: "A communication failed.",
    critical: true,
  },
];

export function getSchedulingEventDefinition(
  event: SchedulingOperationalEvent,
) {
  return schedulingEventDefinitions.find((item) => item.event === event);
}
