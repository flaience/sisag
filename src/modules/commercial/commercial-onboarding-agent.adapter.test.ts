import { describe, expect, it, vi } from "vitest";

import type { CommercialOnboardingRuntimeAdapter } from "./commercial-onboarding-runtime-executor.service";
import { createCommercialOnboardingAgentAdapter } from "./commercial-onboarding-agent.adapter";

const command = {
  key: "23164020-8778-4226-afed-189e8d2333cc:configure_scheduling:start",
  action: "start" as const,
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  stepCode: "configure_scheduling",
  stepPosition: 3,
  executorType: "agent" as const,
  input: {},
};

function adapter(id: string) {
  return {
    id,
    execute: vi.fn().mockResolvedValue({
      outcome: "completed",
      reason: `${id} completed`,
      result: { adapter: id },
    }),
  } satisfies CommercialOnboardingRuntimeAdapter;
}

describe("commercial onboarding agent adapter", () => {
  it("routes scheduling commands to the scheduling adapter", async () => {
    const scheduling = adapter("scheduling-agent");
    const channels = adapter("channels-agent");
    const router = createCommercialOnboardingAgentAdapter({ scheduling, channels });

    await expect(router.execute(command)).resolves.toMatchObject({
      outcome: "completed",
      result: { adapter: "scheduling-agent" },
    });
    expect(scheduling.execute).toHaveBeenCalledWith(command);
    expect(channels.execute).not.toHaveBeenCalled();
  });

  it("routes channel commands to the channels adapter", async () => {
    const scheduling = adapter("scheduling-agent");
    const channels = adapter("channels-agent");
    const router = createCommercialOnboardingAgentAdapter({ scheduling, channels });
    const channelsCommand = {
      ...command,
      key: `${command.onboardingId}:configure_channels:start`,
      stepCode: "configure_channels",
      stepPosition: 5,
    };

    await expect(router.execute(channelsCommand)).resolves.toMatchObject({
      outcome: "completed",
      result: { adapter: "channels-agent" },
    });
    expect(channels.execute).toHaveBeenCalledWith(channelsCommand);
    expect(scheduling.execute).not.toHaveBeenCalled();
  });

  it("rejects an agent step without an adapter", async () => {
    const router = createCommercialOnboardingAgentAdapter({
      scheduling: adapter("scheduling-agent"),
      channels: adapter("channels-agent"),
    });

    await expect(
      router.execute({ ...command, stepCode: "training", stepPosition: 6 }),
    ).resolves.toEqual({
      outcome: "failed",
      reason: "Nenhum agente está configurado para esta etapa do onboarding.",
      error: "unsupported_agent_step:training",
    });
  });

  it("rejects a non-agent executor", async () => {
    const router = createCommercialOnboardingAgentAdapter({
      scheduling: adapter("scheduling-agent"),
      channels: adapter("channels-agent"),
    });

    await expect(
      router.execute({ ...command, executorType: "system" }),
    ).resolves.toEqual({
      outcome: "failed",
      reason: "O roteador de agentes recebeu um executor incompatível.",
      error: "unsupported_agent_executor",
    });
  });
});
