import { describe, expect, it } from "vitest";
import { diagnoseSchedulingSpecificTime } from "./SchedulingReadinessSpecificTimeDiagnosis";

const unitId = "unit-a", serviceId = "service-a", professionalId = "professional-a";
const base = { unitId, serviceId, professionalId, date: "2026-11-09", time: "15:00", durationMinutes: 30, timezone: "America/Sao_Paulo", schedules: [{ unitId, weekday: 1, startTime: "13:00", endTime: "18:00" }], assignments: [{ unitId, serviceId, professionalId, weekday: 1, startTime: "13:00", endTime: "18:00", active: true }], slots: [] };
const slot = (localHour: string, selectedProfessional = professionalId, professionalName = "Ana") => ({ startTime: "2026-11-09T" + localHour + ":00.000Z", endTime: "2026-11-09T" + String(Number(localHour.slice(0, 2)) + 1).padStart(2, "0") + localHour.slice(2) + ":00.000Z", professionalId: selectedProfessional, professionalName });

describe("scheduling readiness specific time diagnosis", () => {
  it("identifies a trusted available slot", () => { expect(diagnoseSchedulingSpecificTime({ ...base, slots: [slot("18:00")] })).toMatchObject({ available: true, reason: "available", evidence: { scheduleCovered: true, assignmentCovered: true, exactSlotExists: true }, readOnly: true }); });
  it("distinguishes schedule and assignment gaps", () => {
    expect(diagnoseSchedulingSpecificTime({ ...base, schedules: [] })).toMatchObject({ reason: "outside_professional_schedule", evidence: { scheduleCovered: false } });
    expect(diagnoseSchedulingSpecificTime({ ...base, assignments: [] })).toMatchObject({ reason: "outside_assignment", evidence: { scheduleCovered: true, assignmentCovered: false } });
  });
  it("reports another assigned professional before generic unavailability", () => { expect(diagnoseSchedulingSpecificTime({ ...base, slots: [slot("18:00", "professional-b", "Bia")] })).toMatchObject({ reason: "assigned_to_other_professional", assignedProfessional: { professionalId: "professional-b", professionalName: "Bia" } }); });
  it("keeps blocking or occupation closed behind configured evidence", () => { expect(diagnoseSchedulingSpecificTime(base)).toMatchObject({ reason: "unavailable_after_configuration", evidence: { scheduleCovered: true, assignmentCovered: true, exactSlotExists: false } }); });
  it("orders alternatives by proximity to the requested time", () => { const result = diagnoseSchedulingSpecificTime({ ...base, slots: [slot("11:00"), slot("17:45"), slot("18:15"), slot("12:00")] }); expect(result.alternatives.map((item) => item.time)).toEqual(["14:45", "15:15", "09:00", "08:00"]); });
});
