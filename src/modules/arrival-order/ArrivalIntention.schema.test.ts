import { describe, expect, it } from "vitest";
import { ArrivalIntentionInputSchema } from "./ArrivalIntention.schema";

const valid = { periodId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222", attendanceDate: "2026-11-23", source: "whatsapp", requestId: "wamid.test" };

describe("arrival intention schema", () => {
  it("accepts a tenant-independent command envelope", () => { expect(ArrivalIntentionInputSchema.parse(valid)).toEqual(valid); });
  it("rejects an invalid date source or request identity", () => {
    expect(ArrivalIntentionInputSchema.safeParse({ ...valid, attendanceDate: "23/11/2026" }).success).toBe(false);
    expect(ArrivalIntentionInputSchema.safeParse({ ...valid, source: "external" }).success).toBe(false);
    expect(ArrivalIntentionInputSchema.safeParse({ ...valid, requestId: "" }).success).toBe(false);
  });
});
