import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v12.json", "utf8"));
const serialized = JSON.stringify(workflow);
const build = workflow.nodes.find((node: { name?: string }) => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode as string;

describe("n8n agent shadow v12 appointment selection", () => {
  it("keeps the v11 webhook while adding the read-only selection", () => {
    expect(workflow.name).toBe("SISAG Agent Shadow v12");
    expect(serialized).toContain("4578414e-786d-42f6-86bb-8632a4540cbb");
    expect(serialized).toContain("scheduling.select_appointment");
  });

  it("builds a bounded sanitized selection candidate", () => {
    for (const value of ["appointment_selection", "selection_required", "not_found_or_ambiguous", "appointmentStatus", "startsAt", "appointment.serviceNames", "slice(0, 3)"]) expect(build).toContain(value);
  });

  it("does not introduce selection-side dispatch or mutation", () => {
    const start = build.indexOf("if (toolName === 'scheduling.select_appointment')");
    const end = build.indexOf("else if (toolName === 'scheduling.list_upcoming_appointments')", start);
    const selectionBranch = build.slice(start, end);
    for (const forbidden of ["appointmentId", "dispatchAllowed", "ExecutionAllowed", "cancelAppointment", "rescheduleAppointment", "createAppointment"]) expect(selectionBranch).not.toContain(forbidden);
    expect(serialized).toContain("sideEffects: 'none'");
  });
});
