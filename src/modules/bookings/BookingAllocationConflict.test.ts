import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ db: vi.fn(), transaction: vi.fn(), unit: vi.fn(), assignment: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: m.db }));
vi.mock("./BookingUnit.resolver", () => ({ resolveBookingUnit: m.unit }));
vi.mock("@/modules/scheduling-config/ServiceBookingAssignment.engine", () => ({ resolveServiceBookingProfessional: m.assignment }));
vi.mock("@/modules/automation/BookingReminderPlanner.service", () => ({ BookingReminderPlannerService: {} }));
import { BookingService } from "./Booking.service";
import { isBookingAllocationOverlap } from "./BookingAllocationConflict";
const overlap = () => ({ code: "23P01", constraint: "booking_alloc_no_overlap" });
describe("createAuto allocation error mapping — database simulated", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.unit.mockResolvedValue("unit-a");
    m.assignment.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const results = [ [{ id: "service-a", durationMinutes: 30 }], [{ id: "requirement-a", resourceTypeId: "type-a", quantity: 1 }], [{ id: "resource-a" }], [] ];
    const select = vi.fn(() => {
      const rows = results.shift();
      if (!rows) throw new Error("Unexpected query");
      const builder: any = {};
      for (const method of ["from", "where", "leftJoin", "innerJoin"]) builder[method] = vi.fn(() => builder);
      builder.limit = vi.fn().mockResolvedValue(rows);
      builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject);
      return builder;
    });
    m.db.mockReturnValue({ select, transaction: m.transaction });
  });
  afterEach(() => vi.restoreAllMocks());
  it.each([
    ["direct overlap", overlap(), "slot_taken"],
    ["wrapped overlap", { cause: overlap() }, "slot_taken"],
    ["nested overlap", { cause: { cause: overlap() } }, "slot_taken"],
    ["other exclusion", { code: "23P01", constraint: "other_constraint" }, "internal_error"],
    ["missing constraint", { code: "23P01" }, "internal_error"],
    ["unique violation", { code: "23505", constraint: "booking_alloc_no_overlap" }, "internal_error"],
    ["connection failure", { code: "08006" }, "internal_error"],
  ])("%s", async (_name, error, expected) => {
    m.transaction.mockRejectedValue(error);
    const result = await BookingService.createAuto({ companyId: "company-a", clientId: "client-a", serviceId: "service-a", startTime: "2030-10-01T13:00:00Z", unitId: "unit-a" });
    expect(m.transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: false, error: expected });
    if (expected === "slot_taken") expect(console.error).not.toHaveBeenCalled();
  });
  it("terminates on a cyclic cause", () => {
    const error: { cause?: unknown } = {}; error.cause = error;
    expect(isBookingAllocationOverlap(error)).toBe(false);
  });
});
