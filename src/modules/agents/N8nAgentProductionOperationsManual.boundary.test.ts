import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manual = readFileSync("docs/n8n-agent-operations-manual.md", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");

describe("n8n agent production operations manual boundary", () => {
  it("documents the current v14 production workflow and guarded write paths", () => {
    expect(manual).toContain("SISAG Agent Shadow v14");
    expect(manual).toContain("scheduling.list_upcoming_appointments");
    expect(manual).toContain("n8n_agent_upcoming_appointments_v1");
    expect(manual).toContain("N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=true");
    expect(manual).toContain("confirmed_pending_execution");
    expect(manual).toContain("execution_uncertain");
    expect(manual).not.toContain("não envia respostas ao WhatsApp");
    expect(manual).not.toContain("construída até a PR #502");
  });

  it("keeps documented production controls anchored in deploy configuration", () => {
    for (const flag of [
      "N8N_AGENT_SHADOW_MIRROR_ENABLED",
      "N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED",
      "N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED",
      "N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED",
      "N8N_AGENT_BOOKING_PROPOSAL_ROUTING_ENABLED",
      "N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED",
      "N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED",
      "N8N_AGENT_BOOKING_CANCELLATION_EXECUTION_ENABLED",
      "N8N_AGENT_BOOKING_RESCHEDULING_EXECUTION_ENABLED",
    ]) {
      expect(deploy).toContain(flag);
      expect(manual).toContain(flag);
    }
  });

  it("records safe rollback and the validated release gate", () => {
    expect(manual).toContain("Interrupção segura e rollback");
    expect(manual).toContain("pnpm test:run");
    expect(manual).toContain("pnpm build");
    expect(manual).toContain("lint global possui dívida histórica");
  });
});
