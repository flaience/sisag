import { describe, expect, it } from "vitest";
import { ServiceBookingAssignmentInputSchema } from "./ServiceBookingAssignment.schema";
const valid = { unitId: "11111111-1111-4111-8111-111111111111", professionalId: "22222222-2222-4222-8222-222222222222", serviceId: null, weekday: 1, startTime: "08:00", endTime: "12:00", priority: 100, active: true };
describe("service booking assignment schema", () => { it("accepts a shift-wide default", () => { expect(ServiceBookingAssignmentInputSchema.parse(valid).serviceId).toBeNull(); }); it("rejects invalid periods", () => { expect(ServiceBookingAssignmentInputSchema.safeParse({ ...valid, endTime: "07:00" }).success).toBe(false); }); });
