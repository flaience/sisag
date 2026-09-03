import { readEnv } from "@/lib/env";
import { OpenAIRecoveryAgentProvider } from "./providers/OpenAIRecoveryAgentProvider";

export function createConfiguredRecoveryAgent() {
  const providerName = readEnv("RECOVERY_AGENT_PROVIDER")?.toLowerCase();
  if (providerName !== "openai") return undefined;
  const apiKey = readEnv("OPENAI_API_KEY");
  const model = readEnv("OPENAI_RECOVERY_MODEL");
  if (!apiKey || !model) return undefined;
  const configuredTimeout = Number(readEnv("RECOVERY_AGENT_TIMEOUT_MS") ?? 8000);
  return { provider: new OpenAIRecoveryAgentProvider({ apiKey, model }), providerName: "openai", timeoutMs: Number.isFinite(configuredTimeout) ? configuredTimeout : 8000 };
}
