import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adapter = readFileSync("src/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter.ts", "utf8");
const command = readFileSync("src/modules/bookings/BookingCommand.service.ts", "utf8");

describe("scheduling past slot booking guard boundary", () => {
  it("clamps availability to the current instant", () => {
    expect(adapter).toContain("const effectiveDateFrom = dateFrom > now ? dateFrom : now");
    expect(adapter).toContain("startsAt >= effectiveDateFrom");
  });

  it("rejects an expired selection before idempotency and booking execution", () => {
    expect(command).toContain("new Date(startTime) <= (dependencies.now?.() ?? new Date())");
    expect(command.indexOf("new Date(startTime) <=")).toBeLessThan(command.indexOf("const fingerprint"));
  });
});
