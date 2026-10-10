import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorObservation.service.ts", "utf8");
const api = fs.readFileSync("src/app/api/v1/settings/agent-shadow/observations/route.ts", "utf8");
const sql = fs.readFileSync("infra/n8n-agent-shadow-mirror-observability.sql", "utf8");

describe("n8n agent shadow mirror observability boundary", () => {
  it("records only sanitized bounded metadata after the mirror completes", () => {
    for (const value of ["correlationId", "status", "durationMs", "policyVersion", "observedAt"]) expect(service).toContain(value);
    for (const forbidden of ["senderPhone", "message.text", "headers", "answerDraft", "evidence"]) expect(service).not.toContain(forbidden);
    expect(route).toContain("N8nAgentShadowMirrorObservationService.record");
    expect(route).toContain(".catch(() => undefined)");
  });
  it("exposes a tenant-scoped authenticated read-only query", () => {
    expect(api).toContain('requireApiRole(request, ["owner", "admin"])');
    expect(api).toContain("auth.auth.companyId");
    expect(api).toContain("export async function GET");
    for (const forbidden of ["POST", "PUT", "PATCH", "DELETE"]) expect(api).not.toContain("export async function " + forbidden);
  });
  it("uses RLS, tenant indexes and an idempotent correlation identity", () => {
    for (const value of ["enable row level security", "unique(company_id, correlation_id)", "company_id", "observed_at"]) expect(sql).toContain(value);
    expect(service).toContain("onConflictDoUpdate");
  });
});
