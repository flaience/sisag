import {
  bookingLifecycleActions,
  canApplyBookingAction,
  getBookingStateDefinition,
  isPersistedBookingState,
  type BookingLifecycleAction,
  type PersistedBookingState,
} from "./Booking.state-contract";

export type BookingStateApiView = {
  persistedStatus: PersistedBookingState;
  state: Lowercase<PersistedBookingState>;
  category: "active" | "terminal" | "compatibility";
  occupiesCapacity: boolean;
  translationKey: string;
  availableActions: BookingLifecycleAction[];
};

export function getBookingStateApiView(value: unknown): BookingStateApiView | null {
  const normalized = typeof value === "string" ? value.toUpperCase() : value;
  if (!isPersistedBookingState(normalized)) return null;

  const definition = getBookingStateDefinition(normalized);
  if (!definition) return null;

  return {
    persistedStatus: normalized,
    state: normalized.toLowerCase() as Lowercase<PersistedBookingState>,
    category: definition.category,
    occupiesCapacity: definition.occupiesCapacity,
    translationKey: definition.translationKey,
    availableActions: bookingLifecycleActions.filter((action) =>
      canApplyBookingAction(normalized, action),
    ),
  };
}
