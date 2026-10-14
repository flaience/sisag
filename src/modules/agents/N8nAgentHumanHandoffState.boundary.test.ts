import fs from "node:fs";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffState.service.ts", "utf8");
const migration = fs.readFileSync("infra/n8n-agent-human-handoff-state.sql", "utf8");

describe("n8n agent human handoff state boundary", () => {
  it("is tenant scoped, idempotent and protected by RLS", () => {
    expect(schema).toContain("n8nAgentHumanHandoffStates");
    expect(schema).toContain("n8n_agent_handoff_company_correlation_uq");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(service).toContain("input.companyId");
    expect(service).toContain("onConflictDoNothing");
  });

  it("stores only sanitized routing metadata", () => {
    const table = schema.slice(schema.indexOf("n8nAgentHumanHandoffStates"), schema.indexOf("n8nAgentShadowMirrorObservations"));
    for (const forbidden of ["message:", "phone:", "summary:", "transcript:", "text:"]) expect(table).not.toContain(forbidden);
    expect(table).toContain("senderKey");
    expect(table).toContain("reasonCode");
  });

  it("does not claim, notify, resolve or dispatch yet", () => {
    for (const forbidden of ["outbox", "whatsapp.send.requested", "claimedBy:", "resolvedAt:", "executeBookingCommand"]) expect(service).not.toContain(forbidden);
    expect(service).toContain('status: "pending"');
    expect(service).toContain("isN8nAgentConversationSuspended");
  });
});