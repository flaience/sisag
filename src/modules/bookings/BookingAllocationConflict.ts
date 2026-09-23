// Drizzle can wrap the original PostgreSQL error in `cause`.
// Match the known allocation constraint, not arbitrary exclusion violations.
export function isBookingAllocationOverlap(error: unknown): boolean {
  const seen = new Set<object>();
  let current: unknown = error;
  for (let depth = 0; depth < 8; depth++) {
    if (!current || typeof current !== "object" || seen.has(current)) return false;
    seen.add(current);
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (candidate.code === "23P01" && candidate.constraint === "booking_alloc_no_overlap") return true;
    current = candidate.cause;
  }
  return false;
}
