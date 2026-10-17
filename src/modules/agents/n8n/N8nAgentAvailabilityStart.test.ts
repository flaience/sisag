import { describe, expect, it } from "vitest";
import { resolveN8nAgentAvailabilityStart } from "./N8nAgentAvailabilityStart";

describe("n8n agent availability start", () => {
  it("uses the tenant lead and aligns to the next interval", () => expect(resolveN8nAgentAvailabilityStart({ requestedFrom: "2026-10-17T03:00:00.000Z", now: new Date("2026-10-17T11:08:20.000Z"), minLeadMinutes: 60 })).toBe("2026-10-17T12:15:00.000Z"));
  it("supports a tenant without minimum lead", () => expect(resolveN8nAgentAvailabilityStart({ requestedFrom: "2026-10-17T03:00:00.000Z", now: new Date("2026-10-17T11:08:20.000Z"), minLeadMinutes: 0 })).toBe("2026-10-17T11:15:00.000Z"));
  it("preserves and aligns a later requested start", () => expect(resolveN8nAgentAvailabilityStart({ requestedFrom: "2026-10-19T12:02:00.000Z", now: new Date("2026-10-17T11:08:20.000Z"), minLeadMinutes: 60 })).toBe("2026-10-19T12:15:00.000Z"));
});
