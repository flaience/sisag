import { describe, expect, it } from "vitest";
import { N8nAgentShadowMirrorResponseSchema } from "./N8nAgentShadowMirrorResponse.schema";

const valid = { accepted: true, mode: "shadow", correlationId: "wamid.shadow-response-1", sideEffects: "none", decision: { action: "request_read_only_tool", toolName: "scheduling.find_available_slots", reasonCode: "availability_required", confidence: 0.99 }, execution: { mode: "ai", provider: "openai", model: "gpt-6-luna", promptVersion: "n8n_agent_shadow_decision_v1", durationMs: 3500, errorCode: null } };
describe("n8n agent shadow mirror response", () => {
  it("accepts only sanitized structured metadata", () => expect(N8nAgentShadowMirrorResponseSchema.parse(valid)).toEqual(valid));
  it.each(["answerDraft", "clarificationQuestion", "evidence", "message", "phone", "headers"])("rejects forbidden field %s", (field) => expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, [field]: "private" }).success).toBe(false));
  it("rejects operational side effects", () => expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, sideEffects: "dispatch" }).success).toBe(false));
});
