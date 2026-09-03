import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("OpenAI recovery provider boundary", () => {
  const provider = fs.readFileSync("src/modules/agents/providers/OpenAIRecoveryAgentProvider.ts", "utf8");
  const factory = fs.readFileSync("src/modules/agents/RecoveryAgentProvider.factory.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/[id]/recommendation/route.ts", "utf8");
  it("uses an explicit strict schema and a bounded request", () => {
    expect(provider).toContain('type: "json_schema"');
    expect(provider).toContain("strict: true");
    expect(provider).toContain("AbortSignal.timeout(request.timeoutMs)");
  });
  it("loads secrets server-side without logging them", () => {
    expect(factory).toContain('readEnv("OPENAI_API_KEY")');
    expect(factory).not.toContain("console.");
    expect(provider).not.toContain("console.");
  });
  it("is composed only into the shadow recommendation flow", () => {
    expect(route).toContain("createConfiguredRecoveryAgent()");
    for (const term of ["outbox", "WhatsApp", "BookingRecoveryManagementService", "MCP", "RAG"]) expect(provider + factory + route).not.toContain(term);
  });
});
