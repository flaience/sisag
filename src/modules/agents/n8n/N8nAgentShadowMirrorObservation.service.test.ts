import { describe, expect, it } from "vitest";
import { classifyN8nAgentShadowMirrorResult } from "./N8nAgentShadowMirrorObservation.service";

describe("n8n agent shadow mirror observation", () => {
  it.each([
    [{ ok: true }, "accepted"],
    [{ ok: false, error: "shadow_webhook_rejected" }, "rejected"],
    [{ ok: false, error: "shadow_transport_failed" }, "transport_failed"],
    [{ ok: false, error: "shadow_configuration_missing" }, "configuration_error"],
  ] as const)("classifies only sanitized outcomes", (result, expected) => {
    expect(classifyN8nAgentShadowMirrorResult(result)).toBe(expected);
  });
});
