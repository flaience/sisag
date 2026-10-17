import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/availability/Availability.service.ts", "utf8");
const candidate = readFileSync("src/modules/agents/n8n/N8nAgentShadowAnswerCandidate.ts", "utf8");
const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v9.json", "utf8");
describe("professional schedule precedence", () => {
  it("loads schedules for professionals linked to every candidate resource", () => { expect(service).toContain("inArray(professionals.resourceId, candidateIds)"); expect(service).toContain("preferredSchedulesForResource(linkedProfessionalRows, legacyResourceRows)"); });
  it("groups displayed times by local date", () => { for (const source of [candidate, workflow]) { expect(source).toContain("groups"); expect(source).toContain("times"); } });
});
