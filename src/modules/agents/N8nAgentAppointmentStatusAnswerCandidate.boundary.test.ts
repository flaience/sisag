import fs from "node:fs";
import { describe, expect, it } from "vitest";
const workflow = JSON.parse(fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v8.json", "utf8"));
const code = workflow.nodes.find((node: { name: string }) => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
describe("n8n agent appointment status answer candidate boundary", () => {
  it("builds status only after the allowlisted read-only result", () => { const execute = workflow.nodes.find((node: { name: string }) => node.name === "Execute SISAG Read Only Tool")?.parameters?.jsonBody ?? ""; expect(code).toContain("scheduling.explain_appointment_status"); expect(code).toContain("operation?.data"); expect(code).toContain("appointment_status"); expect(schema).toContain('z.literal("appointment_status")'); expect(execute).toContain("decision.toolArguments"); expect(execute).not.toContain("Object.fromEntries"); expect(execute).not.toContain("filter("); });
  it("does not expose identity, notes, events or messages", () => { for (const value of ["client.name", "client.phone", "booking.notes", "journey.events", "journey.logs"]) expect(code).not.toContain(value); });
  it("does not dispatch or mutate", () => { const json = JSON.stringify(workflow); const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8"); expect(json).not.toContain("create_appointment"); expect(json).not.toContain("WhatsAppSender"); expect(json).not.toContain("executeBookingCommand"); expect(routing).toContain('candidate.kind !== "availability"'); expect(routing).toContain('candidate.kind !== "appointment_status"'); });
});
