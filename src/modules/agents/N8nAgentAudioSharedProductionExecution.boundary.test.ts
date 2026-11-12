import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const audio = readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts", "utf8");
const execution = readFileSync("src/modules/agents/n8n/N8nAgentSharedProductionExecution.service.ts", "utf8");

describe("n8n agent audio shared production execution boundary", () => {
  it("runs audio through the shared decision and result routing", () => {
    expect(audio).toContain("executeN8nAgentSharedProductionMessage");
    expect(execution).toContain("executeDecision(message)");
    expect(execution).toContain("routeResult({");
  });

  it("preserves the current assistant only as a safe fallback", () => {
    expect(audio).toContain("AssistantWhatsAppService.handleInbound");
    expect(execution).toContain("if (routed.handled)");
    expect(execution).toContain("await fallback(message)");
    expect(execution.indexOf("if (routed.handled)")).toBeLessThan(execution.indexOf("await fallback(message)"));
  });
});
