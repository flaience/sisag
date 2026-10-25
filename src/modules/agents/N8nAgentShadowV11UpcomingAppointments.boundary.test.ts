import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v11.json", "utf8"));
const serialized = JSON.stringify(workflow);
const build = workflow.nodes.find((node: { name?: string }) => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";
const respond = workflow.nodes.find((node: { name?: string }) => node.name === "Respond Shadow Only")?.parameters?.responseBody ?? "";

describe("n8n agent shadow v11 upcoming appointments", () => {
  it("formats at most five trusted upcoming appointments", () => {
    expect(workflow.name).toBe("SISAG Agent Shadow v11");
    expect(build).toContain("scheduling.list_upcoming_appointments");
    expect(build).toContain("['PENDING', 'CONFIRMED']");
    expect(build).toContain("slice(0, 5)");
    expect(build).toContain("kind: 'upcoming_appointments'");
    expect(build).toContain("appointmentCount: lines.length");
    expect(build).toContain("Array.isArray(item.serviceNames)");
    expect(build).toContain("serviceNames.join(', ')");
    expect(build).toContain("new Intl.DateTimeFormat('pt-BR', { timeZone");
  });
  it("preserves the sanitized candidate in the shadow response", () => {
    expect(respond).toContain("answerCandidate: $json.answerCandidate");
    expect(build).toContain("replace(/[\\r\\n\\t]+/g, ' ')");
    expect(build).toContain("length > 500");
  });
  it("does not add messaging or appointment mutation", () => {
    for (const forbidden of ["WhatsAppSender", "OutboxPublisher", "createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(serialized).not.toContain(forbidden);
  });
});
