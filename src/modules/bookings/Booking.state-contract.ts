export const bookingLifecycleStates = [
  "PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "CANCELLED", "COMPLETED", "NO_SHOW",
] as const;

export type BookingLifecycleState = (typeof bookingLifecycleStates)[number];
export const legacyBookingStates = ["RESCHEDULED"] as const;
export type LegacyBookingState = (typeof legacyBookingStates)[number];
export type PersistedBookingState = BookingLifecycleState | LegacyBookingState;

export const bookingLifecycleActions = [
  "confirm", "arrive", "start", "cancel", "reschedule", "complete", "no_show",
] as const;
export type BookingLifecycleAction = (typeof bookingLifecycleActions)[number];

export type BookingStateDefinition = {
  state: PersistedBookingState;
  translationKey: string;
  category: "active" | "terminal" | "compatibility";
  occupiesCapacity: boolean;
  acceptsNewWrites: boolean;
};

export const bookingStateDefinitions: readonly BookingStateDefinition[] = [
  { state: "PENDING", translationKey: "booking.status.pending", category: "active", occupiesCapacity: true, acceptsNewWrites: true },
  { state: "CONFIRMED", translationKey: "booking.status.confirmed", category: "active", occupiesCapacity: true, acceptsNewWrites: true },
  { state: "ARRIVED", translationKey: "booking.status.arrived", category: "active", occupiesCapacity: true, acceptsNewWrites: true },
  { state: "IN_PROGRESS", translationKey: "booking.status.in_progress", category: "active", occupiesCapacity: true, acceptsNewWrites: true },
  { state: "CANCELLED", translationKey: "booking.status.cancelled", category: "terminal", occupiesCapacity: false, acceptsNewWrites: true },
  { state: "COMPLETED", translationKey: "booking.status.completed", category: "terminal", occupiesCapacity: false, acceptsNewWrites: true },
  { state: "NO_SHOW", translationKey: "booking.status.no_show", category: "terminal", occupiesCapacity: false, acceptsNewWrites: true },
  { state: "RESCHEDULED", translationKey: "booking.status.rescheduled_legacy", category: "compatibility", occupiesCapacity: false, acceptsNewWrites: false },
] as const;

export type BookingStateTransition = { from: BookingLifecycleState; action: BookingLifecycleAction; to: BookingLifecycleState };
export const bookingStateTransitions: readonly BookingStateTransition[] = [
  { from: "PENDING", action: "confirm", to: "CONFIRMED" },
  { from: "PENDING", action: "cancel", to: "CANCELLED" },
  { from: "PENDING", action: "reschedule", to: "PENDING" },
  { from: "CONFIRMED", action: "arrive", to: "ARRIVED" },
  { from: "CONFIRMED", action: "cancel", to: "CANCELLED" },
  { from: "CONFIRMED", action: "reschedule", to: "CONFIRMED" },
  { from: "CONFIRMED", action: "no_show", to: "NO_SHOW" },
  { from: "ARRIVED", action: "start", to: "IN_PROGRESS" },
  { from: "ARRIVED", action: "no_show", to: "NO_SHOW" },
  { from: "IN_PROGRESS", action: "complete", to: "COMPLETED" },
] as const;

export function getBookingSourceStates(action: BookingLifecycleAction): BookingLifecycleState[] { return bookingStateTransitions.filter((item) => item.action === action).map((item) => item.from); }
export function getBookingCapacityOccupyingStates(): BookingLifecycleState[] { return bookingStateDefinitions.filter((item): item is BookingStateDefinition & { state: BookingLifecycleState } => item.occupiesCapacity && item.category !== "compatibility").map((item) => item.state); }
export function getBookingStateDefinition(state: PersistedBookingState) { return bookingStateDefinitions.find((item) => item.state === state); }
export function getBookingStateTransition(from: PersistedBookingState, action: BookingLifecycleAction) { if (from === "RESCHEDULED") return undefined; return bookingStateTransitions.find((item) => item.from === from && item.action === action); }
export function canApplyBookingAction(from: PersistedBookingState, action: BookingLifecycleAction) { return Boolean(getBookingStateTransition(from, action)); }
export function applyBookingAction(from: PersistedBookingState, action: BookingLifecycleAction) { return getBookingStateTransition(from, action)?.to; }
export function isPersistedBookingState(value: unknown): value is PersistedBookingState { return typeof value === "string" && bookingStateDefinitions.some((item) => item.state === value); }
