import { afterEach, describe, expect, it, vi } from "vitest";
import { createConfiguredRecoveryAgent } from "./RecoveryAgentProvider.factory";

afterEach(() => vi.unstubAllEnvs());

describe("recovery agent provider factory", () => {
  it("keeps fallback active when configuration is incomplete", () => {
    vi.stubEnv("RECOVERY_AGENT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_RECOVERY_MODEL", "model");
    expect(createConfiguredRecoveryAgent()).toBeUndefined();
  });

  it("creates the OpenAI adapter only with explicit configuration", () => {
    vi.stubEnv("RECOVERY_AGENT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "secret");
    vi.stubEnv("OPENAI_RECOVERY_MODEL", "model");
    vi.stubEnv("RECOVERY_AGENT_TIMEOUT_MS", "5000");
    expect(createConfiguredRecoveryAgent()).toMatchObject({ providerName: "openai", timeoutMs: 5000 });
  });
});
