import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { formatTime } from "@/lib/time";

describe("agenda booking timezone", () => {
  it("formats official UTC bookings in the business timezone", () => {
    expect(formatTime("2026-10-05T14:00:00.000Z", "America/Sao_Paulo")).toBe("11:00");
  });

  it("does not depend on the server timezone", () => {
    const time = fs.readFileSync("src/lib/time.ts", "utf8");
    const agenda = fs.readFileSync("src/modules/agenda/Agenda.service.ts", "utf8");
    expect(time).toContain("timeZone = DEFAULT_TIMEZONE");
    expect(time).toContain("timeZone,");
    expect(agenda).toContain("formatTime(start.toISOString(), DEFAULT_TIMEZONE)");
  });
});
