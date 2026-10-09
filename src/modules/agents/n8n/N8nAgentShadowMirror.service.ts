import fs from "node:fs/promises";
import { N8N_AGENT_FOUNDATION_VERSION, N8nAgentRequestSchema } from "./N8nAgentFoundation.contract";

export type N8nAgentShadowMirrorInput = {
  companyId: string;
  whatsappAccountId: string;
  senderPhoneE164: string;
  providerMessageId: string;
  text: string;
  receivedAt: Date;
  timeZone?: string;
};

type MirrorDependencies = {
  readSecret: (file: string) => Promise<string>;
  fetch: typeof fetch;
};

const defaultDependencies: MirrorDependencies = {
  readSecret: (file) => fs.readFile(file, "utf8"),
  fetch,
};

const enabled = () => process.env.N8N_AGENT_SHADOW_MIRROR_ENABLED === "true";
export const isN8nAgentShadowMirrorEnabled = () => enabled();

export async function mirrorN8nAgentShadowMessage(
  input: N8nAgentShadowMirrorInput,
  dependencies: MirrorDependencies = defaultDependencies,
) {
  if (!enabled()) return { ok: true as const, skipped: true as const, reason: "disabled" as const };
  const endpoint = process.env.N8N_AGENT_SHADOW_WEBHOOK_URL;
  const secretFile = process.env.N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE;
  if (!endpoint || !secretFile) return { ok: false as const, error: "shadow_configuration_missing" as const };
  let url: URL;
  try { url = new URL(endpoint); } catch { return { ok: false as const, error: "shadow_endpoint_invalid" as const }; }
  if (url.protocol !== "https:") return { ok: false as const, error: "shadow_endpoint_invalid" as const };

  const request = N8nAgentRequestSchema.parse({
    policyVersion: N8N_AGENT_FOUNDATION_VERSION,
    trustedContext: {
      companyId: input.companyId,
      whatsappAccountId: input.whatsappAccountId,
      channel: "whatsapp",
      senderPhoneE164: input.senderPhoneE164,
      correlationId: input.providerMessageId,
      receivedAt: input.receivedAt,
      timeZone: input.timeZone ?? "America/Sao_Paulo",
    },
    message: { providerMessageId: input.providerMessageId, text: input.text },
  });

  try {
    const secret = (await dependencies.readSecret(secretFile)).trim();
    if (!secret) return { ok: false as const, error: "shadow_secret_empty" as const };
    const response = await dependencies.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sisag-agent-shadow-secret": secret },
      body: JSON.stringify({ request, toolCall: { name: "scheduling.find_available_slots", arguments: {} } }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    return response.ok
      ? { ok: true as const, skipped: false as const }
      : { ok: false as const, error: "shadow_webhook_rejected" as const };
  } catch {
    return { ok: false as const, error: "shadow_transport_failed" as const };
  }
}
