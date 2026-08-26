export const bookingLifecycleStates = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type BookingLifecycleState = (typeof bookingLifecycleStates)[number];

export const legacyBookingStates = ["RESCHEDULED"] as const;
export type LegacyBookingState = (typeof legacyBookingStates)[number];

export type PersistedBookingState =
  | BookingLifecycleState
  | LegacyBookingState;

export const bookingLifecycleActions = [
  "confirm",
  "cancel",
  "reschedule",
  "complete",
] as const;

export type BookingLifecycleAction =
  (typeof bookingLifecycleActions)[number];

export type BookingStateDefinition = {
  state: PersistedBookingState;
  translationKey: string;
  category: "active" | "terminal" | "compatibility";
  occupiesCapacity: boolean;
  acceptsNewWrites: boolean;
};

export const bookingStateDefinitions: readonly BookingStateDefinition[] = [
  {
    state: "PENDING",
    translationKey: "booking.status.pending",
    category: "active",
    occupiesCapacity: true,
    acceptsNewWrites: true,
  },
  {
    state: "CONFIRMED",
    translationKey: "booking.status.confirmed",
    category: "active",
    occupiesCapacity: true,
    acceptsNewWrites: true,
  },
  {
    state: "CANCELLED",
    translationKey: "booking.status.cancelled",
    category: "terminal",
    occupiesCapacity: false,
    acceptsNewWrites: true,
  },
  {
    state: "COMPLETED",
    translationKey: "booking.status.completed",
    category: "terminal",
    occupiesCapacity: false,
    acceptsNewWrites: true,
  },
  {
    state: "RESCHEDULED",
    translationKey: "booking.status.rescheduled_legacy",
    category: "compatibility",
    occupiesCapacity: false,
    acceptsNewWrites: false,
  },
] as const;

export type BookingStateTransition = {
  from: BookingLifecycleState;
  action: BookingLifecycleAction;
  to: BookingLifecycleState;
};

export const bookingStateTransitions: readonly BookingStateTransition[] = [
  { from: "PENDING", action: "confirm", to: "CONFIRMED" },
  { from: "PENDING", action: "cancel", to: "CANCELLED" },
  { from: "PENDING", action: "reschedule", to: "PENDING" },
  { from: "CONFIRMED", action: "cancel", to: "CANCELLED" },
  { from: "CONFIRMED", action: "reschedule", to: "CONFIRMED" },
  { from: "CONFIRMED", action: "complete", to: "COMPLETED" },
] as const;

export function getBookingSourceStates(
  action: BookingLifecycleAction,
): BookingLifecycleState[] {
  return bookingStateTransitions
    .filter((transition) => transition.action === action)
    .map((transition) => transition.from);
}

export function getBookingCapacityOccupyingStates(): BookingLifecycleState[] {
  return bookingStateDefinitions
    .filter(
      (definition): definition is BookingStateDefinition & {
        state: BookingLifecycleState;
      } =>
        definition.occupiesCapacity &&
        definition.category !== "compatibility",
    )
    .map((definition) => definition.state);
}

export function getBookingStateDefinition(state: PersistedBookingState) {
  return bookingStateDefinitions.find((definition) => definition.state === state);
}

export function getBookingStateTransition(
  from: PersistedBookingState,
  action: BookingLifecycleAction,
) {
  if (from === "RESCHEDULED") return undefined;
  return bookingStateTransitions.find(
    (transition) => transition.from === from && transition.action === action,
  );
}

export function canApplyBookingAction(
  from: PersistedBookingState,
  action: BookingLifecycleAction,
) {
  return Boolean(getBookingStateTransition(from, action));
}

export function applyBookingAction(
  from: PersistedBookingState,
  action: BookingLifecycleAction,
) {
  return getBookingStateTransition(from, action)?.to;
}

export function isPersistedBookingState(
  value: unknown,
): value is PersistedBookingState {
  return (
    typeof value === "string" &&
    bookingStateDefinitions.some((definition) => definition.state === value)
  );
}
