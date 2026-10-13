import fs from "node:fs";
import { describe, expect, it } from "vitest";

const fullSchema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
const observationSchema = fullSchema.slice(fullSchema.indexOf("export const n8nAgentShadowMirrorObservations"), fullSchema.indexOf("export const n8nAgentShadowMirrorObservations") + 2400);
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorObservation.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const migration = fs.readFileSync("infra/n8n-agent-conversation-context-observability.sql", "utf8");

describe("n8n agent conversation context observability boundary", () => {
  it("persists and exposes only the boolean continuation indicator", () => {
    expect(observationSchema).toContain('contextContinued: boolean("context_continued")');
    expect(service).toContain("contextContinued: input.contextContinued === true");
    expect(service).toContain("contextContinued: n8nAgentShadowMirrorObservations.contextContinued");
    expect(migration).toContain("context_continued boolean not null default false");
    expect(route).toContain("contextContinued: contextual.continued");
  });

  it("defaults missing context to false and updates idempotently", () => {
    expect(service).toContain("input.contextContinued === true");
    expect(service).toContain("contextContinued: values.contextContinued");
    expect(migration).toContain("not null default false");
  });

  it("does not add message, phone, service or slot payloads to observations", () => {
    for (const forbidden of ["messageText", "senderPhone", "serviceName", "slotText", "previousMessage"]) expect(service + observationSchema + migration).not.toContain(forbidden);
  });
});
