import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/v1/settings/agent-shadow/handoffs/route.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffManagement.service.ts", "utf8");
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffManagement.schema.ts", "utf8");

describe("n8n agent human handoff management api boundary", () => {
  it("derives tenant and actor only from authenticated roles", () => {
    expect(route).toContain('requireApiRole(request, ["owner", "admin", "staff"])');
    expect(route).toContain("auth.auth.companyId");
    expect(route).toContain("auth.auth.userId");
    expect(schema).not.toContain("companyId");
    expect(schema).not.toContain("actorId");
  });

  it("lists only the minimum authenticated operational context", () => {
    for (const forbidden of ["senderKey:", "messageLogs.body", "message:", "text:", "transcript:"]) expect(service).not.toContain(forbidden);
    expect(service).toContain("reasonCode:");
    expect(service).toContain("contactPhoneE164");
    expect(route).toContain('"cache-control": "no-store"');
  });

  it("uses atomic guarded transitions and records actors", () => {
    expect(service).toContain('status: "claimed", claimedBy: input.actorId');
    expect(service).toContain('status: "resolved", resolvedBy: input.actorId');
    expect(service).toContain('eq(n8nAgentHumanHandoffStates.claimedBy, input.actorId)');
    expect(service).toContain('status: "dismissed", resolvedBy: input.actorId');
  });

  it("does not dispatch, execute, reopen or expose a delete operation", () => {
    for (const forbidden of ["outbox", "WhatsApp", "executeBookingCommand", "reopen", "export async function DELETE"]) expect(route + service + schema).not.toContain(forbidden);
  });
});