import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v6.json", "utf8"));
const serialized = JSON.stringify(workflow);
const build = workflow.nodes.find((node: { name: string }) => node.name === "Build Answer And Booking Proposal");

describe("n8n agent shadow v6 booking proposal workflow", () => {
  it("preserves the inactive shadow-only operational boundary", () => {
    expect(workflow.name).toBe("SISAG Agent Shadow v6");
    expect(workflow.active).toBe(false);
    expect(workflow.settings).toMatchObject({ saveDataErrorExecution: "none", saveDataSuccessExecution: "none", saveManualExecutions: false });
    expect(serialized).toContain("sideEffects");
    expect(serialized).not.toContain("createAppointment");
    expect(serialized).not.toContain("executeBookingCommand");
  });
  it("builds a proposal only from one trusted returned slot and service id", () => {
    expect(build.parameters.jsCode).toContain("operation.data");
    expect(build.parameters.jsCode).toContain("args.serviceId");
    expect(build.parameters.jsCode).toContain("timeSelected.length === 1");
    expect(build.parameters.jsCode).toContain("dispatchAllowed: false");
    expect(build.parameters.jsCode).toContain("bookingExecutionAllowed: false");
  });
  it("returns the proposal without dispatching or persisting it", () => {
    expect(serialized).toContain("bookingConfirmationProposal");
    expect(serialized).not.toContain("whatsapp.send.requested");
    expect(serialized).not.toContain("selected_slot");
  });
});
