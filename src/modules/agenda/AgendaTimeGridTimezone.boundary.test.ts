import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/components/agenda/AgendaTimeColumn.tsx", "utf8");

describe("agenda time grid timezone boundary", () => {
  it("positions cards from the business-local label and duration", () => {
    expect(source).toContain("agendaTimeLabelToMinutes(item.timeLabel)");
    expect(source).toContain("startMinutes + item.durationMinutes");
    expect(source).not.toContain("date.getHours()");
    expect(source).not.toContain("date.getMinutes()");
  });
});
