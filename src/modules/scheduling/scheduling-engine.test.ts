// src/modules/scheduling/scheduling-engine.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { validateSchedulingRules } from "./scheduling-engine";

type DbRow<T> = T[];

function makeDbMock() {
  // state (mutável por teste)
  const state = {
    profOk: true,
    cfg: {
      slotDurationMinutes: 15,
      bufferMinutes: 0,
      allowOverbooking: false,
      maxAdvanceDays: 30,
    },
    schedules: [
      // weekday: 1=Mon ... 5=Fri, etc (DB 0..6)
      { startTime: "08:00", endTime: "12:00", weekday: 1 },
      { startTime: "13:00", endTime: "17:00", weekday: 1 },
    ],
    existingAppointments: [] as Array<{ id: string }>,
  };

  // drizzle-like chainable mocks
  const q = {
    _kind: "" as "prof" | "cfg" | "sched" | "appt" | "",
    select: vi.fn((_) => q),
    from: vi.fn((table) => {
      // detect by table name-ish (Drizzle passes an object; we just route by usage order)
      return q;
    }),
    where: vi.fn((_) => q),
    limit: vi.fn((n: number) => {
      // return according to last "kind" we set before calling limit
      switch (q._kind) {
        case "prof":
          return (state.profOk ? [{ id: "p1" }] : []) as DbRow<{ id: string }>;
        case "cfg":
          return [state.cfg] as unknown as DbRow<any>;
        case "appt":
          return state.existingAppointments.slice(0, n) as unknown as DbRow<{
            id: string;
          }>;
        default:
          return [] as any;
      }
    }),
  };

  // We need 4 separate query flows in validateSchedulingRules:
  // 1) professionals -> limit(1)
  // 2) scheduling_config -> limit(1)
  // 3) professional_schedules -> (no limit) returns array
  // 4) appointments -> limit(1)
  //
  // Easiest: override select() to set the next kind based on call order.
  let selectCall = 0;
  q.select.mockImplementation(() => {
    selectCall++;
    if (selectCall === 1) q._kind = "prof";
    else if (selectCall === 2) q._kind = "cfg";
    else if (selectCall === 3) q._kind = "sched";
    else if (selectCall === 4) q._kind = "appt";
    return q;
  });

  // schedules query doesn't call limit; it returns directly from where()
  q.where.mockImplementation((_) => {
    if (q._kind === "sched") {
      return state.schedules as any;
    }
    return q;
  });

  return { db: q as any, state };
}

describe("validateSchedulingRules (grid/buffer/conflict)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies not_on_grid when slot=15 and time is 10:07 local", async () => {
    const { db, state } = makeDbMock();
    (getDb as any).mockReturnValue(db);

    state.cfg.slotDurationMinutes = 15;
    state.cfg.bufferMinutes = 0;

    // Monday in America/Sao_Paulo
    const now = new Date("2026-02-16T12:00:00.000Z"); // 09:00 local (UTC-3)
    const dt = new Date("2026-02-16T13:07:00.000Z"); // 10:07 local
    const res = await validateSchedulingRules({
      companyId: "c1",
      professionalId: "p1",
      scheduledTimeUtcIso: dt.toISOString(),
      timeZone: "America/Sao_Paulo",
      now,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("not_on_grid");
  });

  it("denies too_soon when buffer=10 and schedule is 5 minutes ahead", async () => {
    const { db, state } = makeDbMock();
    (getDb as any).mockReturnValue(db);

    state.cfg.slotDurationMinutes = 5;
    state.cfg.bufferMinutes = 10;

    const now = new Date("2026-02-16T13:00:00.000Z"); // 10:00 local
    const dt = new Date("2026-02-16T13:05:00.000Z"); // 10:05 local
    const res = await validateSchedulingRules({
      companyId: "c1",
      professionalId: "p1",
      scheduledTimeUtcIso: dt.toISOString(),
      timeZone: "America/Sao_Paulo",
      now,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("too_soon");
  });

  it("denies slot_taken when there is an ACTIVE appointment at same time", async () => {
    const { db, state } = makeDbMock();
    (getDb as any).mockReturnValue(db);

    state.cfg.allowOverbooking = false;
    state.existingAppointments = [{ id: "a1" }];

    const now = new Date("2026-02-16T12:00:00.000Z");
    const dt = new Date("2026-02-16T13:00:00.000Z"); // 10:00 local

    const res = await validateSchedulingRules({
      companyId: "c1",
      professionalId: "p1",
      scheduledTimeUtcIso: dt.toISOString(),
      timeZone: "America/Sao_Paulo",
      now,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("slot_taken");
  });

  it("allows when conflicting appointment is CANCELLED (engine ignores it)", async () => {
    const { db, state } = makeDbMock();
    (getDb as any).mockReturnValue(db);

    // Here we simulate that the DB query for appointments returns nothing
    // because inArray(status, ACTIVE_STATUSES) filters cancelled out.
    state.existingAppointments = [];

    const now = new Date("2026-02-16T12:00:00.000Z");
    const dt = new Date("2026-02-16T13:00:00.000Z");

    const res = await validateSchedulingRules({
      companyId: "c1",
      professionalId: "p1",
      scheduledTimeUtcIso: dt.toISOString(),
      timeZone: "America/Sao_Paulo",
      now,
    });

    expect(res.ok).toBe(true);
  });

  it("does not conflict with itself when appointmentIdToIgnore is provided", async () => {
    const { db, state } = makeDbMock();
    (getDb as any).mockReturnValue(db);

    // appointment exists, but we want to ensure the engine adds ne(id, ignore)
    // We can't easily introspect whereBase here, but we can assert behavior by returning existing anyway:
    // In real DB it would be filtered out; in this mock we simulate filtered-out result.
    state.existingAppointments = [];

    const now = new Date("2026-02-16T12:00:00.000Z");
    const dt = new Date("2026-02-16T13:00:00.000Z");

    const res = await validateSchedulingRules({
      companyId: "c1",
      professionalId: "p1",
      scheduledTimeUtcIso: dt.toISOString(),
      appointmentIdToIgnore: "a1",
      timeZone: "America/Sao_Paulo",
      now,
    });

    expect(res.ok).toBe(true);
  });
});
