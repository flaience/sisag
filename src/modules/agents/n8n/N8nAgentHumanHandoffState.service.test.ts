import { describe, expect, it } from "vitest";
import { deriveN8nAgentHandoffSenderKey, isN8nAgentHandoffStatusSuspended, N8N_AGENT_ACTIVE_HANDOFF_STATUSES } from "./N8nAgentHumanHandoffState.service";

describe("n8n agent human handoff state", () => {
  it("derives a stable opaque identity from normalized input", () => {
    const a = deriveN8nAgentHandoffSenderKey("company", "account", "+55 (54) 99999-6187");
    const b = deriveN8nAgentHandoffSenderKey("company", "account", "5554999996187");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toContain("6187");
  });

  it("suspends only pending or claimed conversations", () => {
    expect(N8N_AGENT_ACTIVE_HANDOFF_STATUSES).toEqual(["pending", "claimed"]);
    expect(isN8nAgentHandoffStatusSuspended("pending")).toBe(true);
    expect(isN8nAgentHandoffStatusSuspended("claimed")).toBe(true);
    for (const status of ["resolved", "dismissed", "superseded"]) expect(isN8nAgentHandoffStatusSuspended(status)).toBe(false);
  });
});