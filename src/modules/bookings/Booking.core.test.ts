import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
} from "@/drizzle/schema";
import { BookingCoreService } from "./Booking.core";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/drizzle/schema", () => ({
  bookings: {
    id: "bookings.id",
    companyId: "bookings.companyId",
    clientId: "bookings.clientId",
    startTime: "bookings.startTime",
    status: "bookings.status",
  },
  bookingItems: {
    id: "bookingItems.id",
    bookingId: "bookingItems.bookingId",
  },
  bookingItemAllocations: {
    id: "allocations.id",
    bookingItemId: "allocations.bookingItemId",
    resourceId: "allocations.resourceId",
    startTime: "allocations.startTime",
    endTime: "allocations.endTime",
  },
  bookingEvents: { id: "events.id" },
  services: {
    id: "services.id",
    companyId: "services.companyId",
    durationMinutes: "services.durationMinutes",
  },
  serviceRequirements: {
    id: "requirements.id",
    serviceId: "requirements.serviceId",
    resourceTypeId: "requirements.resourceTypeId",
    quantity: "requirements.quantity",
  },
  resources: {
    id: "resources.id",
    companyId: "resources.companyId",
    typeId: "resources.typeId",
    status: "resources.status",
    name: "resources.name",
  },
  professionals: {
    id: "professionals.id",
    companyId: "professionals.companyId",
    resourceId: "professionals.resourceId",
  },
}));

type QueryMock = {
  from: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
};

function query(rows: unknown[]): QueryMock {
  const promise = Promise.resolve(rows);
  const limited = Object.assign(promise, {
    limit: vi.fn(() => promise),
  });
  const builder = {} as QueryMock;
  builder.from = vi.fn(() => builder);
  builder.innerJoin = vi.fn(() => builder);
  builder.where = vi.fn(() => limited);
  return builder;
}

function insertBuilder(returnedRows: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(returnedRows);
  const values = vi.fn(() => ({ returning }));
  return { values, returning };
}

function createDb(options: {
  preTransactionConflicts: unknown[];
  transactionConflicts?: unknown[];
}) {
  const topQueries = [
    query([{ id: "service-1", durationMinutes: 30 }]),
    query([
      {
        id: "requirement-1",
        resourceTypeId: "type-1",
        quantity: 1,
      },
    ]),
    query([{ id: "resource-1" }]),
    query(options.preTransactionConflicts),
  ];
  const transactionConflictQuery = query(
    options.transactionConflicts ?? [],
  );

  const bookingInsert = insertBuilder([{ id: "booking-1" }]);
  const itemInsert = insertBuilder([{ id: "item-1" }]);
  const allocationInsert = insertBuilder();
  const eventInsert = insertBuilder();
  const insert = vi.fn((table: unknown) => {
    if (table === bookings) return bookingInsert;
    if (table === bookingItems) return itemInsert;
    if (table === bookingItemAllocations) return allocationInsert;
    return eventInsert;
  });

  const tx = {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn(() => transactionConflictQuery),
    insert,
  };
  const transaction = vi.fn(
    async (callback: (transactionClient: typeof tx) => Promise<unknown>) =>
      callback(tx),
  );
  let queryIndex = 0;
  const db = {
    select: vi.fn(() => topQueries[queryIndex++]!),
    transaction,
  };

  return {
    db,
    tx,
    transaction,
    topQueries,
    transactionConflictQuery,
    bookingInsert,
  };
}

const input = {
  companyId: "company-1",
  clientId: "client-1",
  serviceId: "service-1",
  startTime: "2026-08-05T14:00:00.000Z",
};

describe("BookingCoreService.createAuto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a conflict with an active booking before opening a transaction", async () => {
    const fixture = createDb({
      preTransactionConflicts: [{ id: "active-allocation" }],
    });
    vi.mocked(getDb).mockReturnValue(fixture.db as never);

    const result = await BookingCoreService.createAuto(input);

    expect(result).toEqual({ ok: false, error: "slot_taken" });
    expect(fixture.transaction).not.toHaveBeenCalled();
    expect(fixture.topQueries[3]!.innerJoin).toHaveBeenCalledTimes(2);
  });

  it("creates after historical allocations are excluded from active conflicts", async () => {
    const fixture = createDb({ preTransactionConflicts: [] });
    vi.mocked(getDb).mockReturnValue(fixture.db as never);

    const result = await BookingCoreService.createAuto(input);

    expect(result).toMatchObject({
      ok: true,
      booking: { id: "booking-1", status: "PENDING" },
    });
    expect(fixture.transaction).toHaveBeenCalledTimes(1);
    expect(fixture.tx.execute).toHaveBeenCalledTimes(1);
    expect(fixture.transactionConflictQuery.innerJoin).toHaveBeenCalledTimes(2);
    expect(fixture.bookingInsert.values).toHaveBeenCalledTimes(1);
  });

  it("rejects a conflict found after acquiring the resource lock", async () => {
    const fixture = createDb({
      preTransactionConflicts: [],
      transactionConflicts: [{ id: "concurrent-allocation" }],
    });
    vi.mocked(getDb).mockReturnValue(fixture.db as never);

    const result = await BookingCoreService.createAuto(input);

    expect(result).toEqual({ ok: false, error: "slot_taken" });
    expect(fixture.tx.execute).toHaveBeenCalledTimes(1);
    expect(fixture.bookingInsert.values).not.toHaveBeenCalled();
  });

  it("maps a database exclusion race to slot_taken", async () => {
    const fixture = createDb({ preTransactionConflicts: [] });
    const postgresError = Object.assign(new Error("exclusion violation"), {
      code: "23P01",
    });
    const drizzleError = Object.assign(new Error("Failed query"), {
      cause: postgresError,
    });
    fixture.transaction.mockRejectedValueOnce(drizzleError);
    vi.mocked(getDb).mockReturnValue(fixture.db as never);

    const result = await BookingCoreService.createAuto(input);

    expect(result).toEqual({ ok: false, error: "slot_taken" });
    expect(fixture.transaction).toHaveBeenCalledTimes(1);
  });
});
