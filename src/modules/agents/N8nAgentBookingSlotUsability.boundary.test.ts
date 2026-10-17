import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const schema = readFileSync("src/drizzle/schema.ts", "utf8");
const page = readFileSync("src/app/admin/settings/scheduling/page.tsx", "utf8");
const route = readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const selection = readFileSync("src/modules/agents/n8n/N8nAgentBookingSlotSelection.ts", "utf8");
const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v9.json", "utf8");
describe("n8n agent booking slot usability boundary", () => {
  it("stores and exposes tenant booking lead configuration", () => { expect(schema).toContain('minBookingAdvanceMinutes: integer("min_booking_advance_minutes")'); expect(page).toContain("Antecedência mínima para novos agendamentos"); });
  it("loads the tenant rule before the read-only search", () => { expect(route).toContain("loadN8nAgentBookingMinLeadMinutes(companyId)"); expect(route).toContain("resolveN8nAgentAvailabilityStart"); });
  it("supports the last displayed slot consistently", () => { expect(selection).toContain("Math.min(slots.length, 3) - 1"); expect(workflow).toContain("Math.min(ordered.length, 3) - 1"); });
});
