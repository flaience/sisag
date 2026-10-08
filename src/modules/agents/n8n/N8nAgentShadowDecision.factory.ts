import { readFile } from "node:fs/promises";
import { readEnv } from "@/lib/env";
import { OpenAIRecoveryAgentProvider } from "../providers/OpenAIRecoveryAgentProvider";

async function readOpenAIKey() {
  const configured = readEnv("OPENAI_API_KEY");
  if (configured) return configured;
  try { return (await readFile("/run/secrets/openai_api_key", "utf8")).trim() || undefined; } catch { return undefined; }
}

export async function createConfiguredN8nAgentShadowDecisionProvider() {
  if (readEnv("N8N_AGENT_SHADOW_PROVIDER")?.toLowerCase() !== "openai") return undefined;
  const model = readEnv("N8N_AGENT_SHADOW_MODEL");
  const apiKey = await readOpenAIKey();
  if (!model || !apiKey) return undefined;
  const configuredTimeout = Number(readEnv("N8N_AGENT_SHADOW_TIMEOUT_MS") ?? 8000);
  return { provider: new OpenAIRecoveryAgentProvider({ apiKey, model }), providerName: "openai", timeoutMs: Number.isFinite(configuredTimeout) ? configuredTimeout : 8000 };
}
