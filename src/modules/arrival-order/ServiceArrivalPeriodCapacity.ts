export type ArrivalPeriodCapacity = {
  capacity: number | null;
  reserved: number;
  available: boolean;
  remaining: number | null;
};

export function evaluateArrivalPeriodCapacity(capacity: number | null, reserved: number): ArrivalPeriodCapacity {
  const safeReserved = Math.max(0, Math.trunc(reserved));
  if (capacity === null) return { capacity: null, reserved: safeReserved, available: true, remaining: null };
  const remaining = Math.max(0, capacity - safeReserved);
  return { capacity, reserved: safeReserved, available: remaining > 0, remaining };
}
