import fs from "node:fs";
import { describe, expect, it } from "vitest";

const paths = [
  "src/components/agenda/AgendaAppointmentCard.tsx",
  "src/components/agenda/AgendaTimeCard.tsx",
];

describe("agenda official booking navigation", () => {
  it.each(paths)("opens the official booking journey from %s", path => {
    const source = fs.readFileSync(path, "utf8");
    expect(source).toContain('href={`/admin/bookings/${item.id}/journey`}');
    expect(source).not.toContain("/admin/appointments/");
  });
});
