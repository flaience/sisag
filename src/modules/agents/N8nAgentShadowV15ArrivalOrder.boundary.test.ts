import fs from "node:fs";
import { describe, expect, it } from "vitest";

const raw = fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v15.json", "utf8");
const workflow = JSON.parse(raw);
const build = workflow.nodes.find((node: { name: string }) => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";

describe("n8n agent shadow v15 arrival order", () => {
  it("is an inactive no-retention shadow workflow", () => {
    expect(workflow.name).toBe("SISAG Agent Shadow v15"); expect(workflow.active).toBe(false);
    expect(workflow.settings).toMatchObject({ saveDataErrorExecution: "none", saveDataSuccessExecution: "none", saveManualExecutions: false });
    expect(raw).toContain("sideEffects"); expect(raw).toContain("none");
  });
  it("builds only a bounded sanitized arrival-order candidate", () => {
    for (const value of ["scheduling.list_arrival_periods", "arrival_order_availability", "periods.slice(0, 5)", "length > 500", "Nenhum horário ou posição na fila foi reservado"]) expect(build).toContain(value);
    expect(raw).toContain("['scheduling.explain_appointment_status', 'scheduling.list_arrival_periods'].includes");
    for (const value of ["clientId", "requestId", "periodId"]) expect(build.slice(build.indexOf("scheduling.list_arrival_periods"), build.indexOf("scheduling.resolve_selected_appointment_action"))).not.toContain(value);
  });
  it("does not send register cancel or mutate", () => {
    for (const value of ["WhatsAppSender", "registerArrivalIntention", "cancelArrivalIntention", "create_appointment", "outbox"]) expect(raw).not.toContain(value);
  });
});
