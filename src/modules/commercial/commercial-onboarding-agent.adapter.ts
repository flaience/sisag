import { createCommercialOnboardingChannelsAdapter } from "./commercial-onboarding-channels.adapter";
import type { CommercialOnboardingRuntimeAdapter } from "./commercial-onboarding-runtime-executor.service";
import { createCommercialOnboardingSchedulingAdapter } from "./commercial-onboarding-scheduling.adapter";

type AgentAdapterOptions = {
  scheduling?: CommercialOnboardingRuntimeAdapter;
  channels?: CommercialOnboardingRuntimeAdapter;
};

export function createCommercialOnboardingAgentAdapter(
  options: AgentAdapterOptions = {},
): CommercialOnboardingRuntimeAdapter {
  const adapters: Record<string, CommercialOnboardingRuntimeAdapter> = {
    configure_scheduling:
      options.scheduling ?? createCommercialOnboardingSchedulingAdapter(),
    configure_channels:
      options.channels ?? createCommercialOnboardingChannelsAdapter(),
  };

  return {
    id: "commercial-onboarding-agent-router",

    async execute(command) {
      if (command.executorType !== "agent") {
        return {
          outcome: "failed",
          reason: "O roteador de agentes recebeu um executor incompatível.",
          error: "unsupported_agent_executor",
        };
      }

      const adapter = adapters[command.stepCode];
      if (!adapter) {
        return {
          outcome: "failed",
          reason: "Nenhum agente está configurado para esta etapa do onboarding.",
          error: `unsupported_agent_step:${command.stepCode}`,
        };
      }

      return adapter.execute(command);
    },
  };
}
