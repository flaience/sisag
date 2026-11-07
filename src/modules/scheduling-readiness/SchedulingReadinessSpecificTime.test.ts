import { describe, expect, it } from "vitest";
import { evaluateSpecificTimeAvailability } from "./SchedulingReadinessSpecificTime";

const slots = [
  { startTime: "2026-11-09T12:00:00.000Z", endTime: "2026-11-09T12:30:00.000Z", professionalId: "professional-a", professionalName: "Ana" },
  { startTime: "2026-11-09T15:00:00.000Z", endTime: "2026-11-09T15:30:00.000Z", professionalId: "professional-b", professionalName: "Bia" },
];

describe("scheduling readiness specific time", () => {
  it("matches the requested local date and time for the selected professional", () => {
    expect(evaluateSpecificTimeAvailability({ slots, date: "2026-11-09", time: "09:00", timezone: "America/Sao_Paulo", professionalId: "professional-a" })).toMatchObject({ available: true, selected: { professionalId: "professional-a" }, assignedToDifferentProfessional: null });
  });

  it("distinguishes another assigned professional from an unavailable time", () => {
    expect(evaluateSpecificTimeAvailability({ slots, date: "2026-11-09", time: "12:00", timezone: "America/Sao_Paulo", professionalId: "professional-a" })).toMatchObject({ available: false, assignedToDifferentProfessional: { professionalId: "professional-b", professionalName: "Bia" } });
    expect(evaluateSpecificTimeAvailability({ slots, date: "2026-11-09", time: "15:00", timezone: "America/Sao_Paulo", professionalId: "professional-a" })).toMatchObject({ available: false, assignedToDifferentProfessional: null });
  });
});
