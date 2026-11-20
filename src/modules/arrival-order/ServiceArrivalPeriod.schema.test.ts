import { describe, expect, it } from "vitest";
import { ServiceArrivalPeriodInputSchema } from "./ServiceArrivalPeriod.schema";

const valid = { unitId: "11111111-1111-4111-8111-111111111111", serviceId: "22222222-2222-4222-8222-222222222222", weekday: 1, startTime: "08:00", endTime: "12:00" };

describe("service arrival period schema", () => {
  it("accepts an unlimited period", () => {
    expect(ServiceArrivalPeriodInputSchema.parse(valid)).toMatchObject({ capacity: null, active: true });
  });

  it("accepts a bounded period", () => {
    expect(ServiceArrivalPeriodInputSchema.parse({ ...valid, capacity: 30 }).capacity).toBe(30);
  });

  it("rejects invalid time ranges and capacity", () => {
    expect(ServiceArrivalPeriodInputSchema.safeParse({ ...valid, endTime: "07:00" }).success).toBe(false);
    expect(ServiceArrivalPeriodInputSchema.safeParse({ ...valid, capacity: 0 }).success).toBe(false);
  });
});
