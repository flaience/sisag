import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { whatsappAccounts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type WhatsAppAudioSecrets = {
  metaAccessToken: string;
  openAIApiKey: string;
  openAIModel: string;
};

type AccountRow = { providerConfig: unknown };
export type WhatsAppAudioSecretDependencies = {
  findAccount: (input: { companyId: string; whatsappAccountId: string }) => Promise<AccountRow | null>;
  readSecret: (name: string) => Promise<string | null>;
};

const SECRET_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const MODEL_NAME = /^[A-Za-z0-9._:-]{1,100}$/;

export function dockerSecretPath(name: string) {
  if (!SECRET_NAME.test(name)) return null;
  return "/run/secrets/" + name;
}

async function readDockerSecret(name: string) {
  const secretPath = dockerSecretPath(name);
  if (!secretPath) return null;
  try {
    const value = (await readFile(secretPath, "utf8")).trim();
    return value || null;
  } catch {
    return null;
  }
}

const defaultDependencies: WhatsAppAudioSecretDependencies = {
  findAccount: async ({ companyId, whatsappAccountId }) => {
    const rows = await getDb().select({ providerConfig: whatsappAccounts.providerConfig })
      .from(whatsappAccounts)
      .where(and(
        eq(whatsappAccounts.companyId, companyId),
        eq(whatsappAccounts.id, whatsappAccountId),
        eq(whatsappAccounts.provider, "meta"),
        eq(whatsappAccounts.status, "active"),
      )).limit(1);
    return rows[0] ?? null;
  },
  readSecret: readDockerSecret,
};

type AudioConfig = {
  metaAccessTokenSecret?: unknown;
  openAIApiKeySecret?: unknown;
  openAIModel?: unknown;
  accessToken?: unknown;
  apiKey?: unknown;
};

function audioConfig(value: unknown): AudioConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const candidate = root.audioProcessing;
  return candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate as AudioConfig : null;
}

export class WhatsAppAudioSecretResolver {
  static async resolve(input: { companyId: string; whatsappAccountId: string }, dependencies: WhatsAppAudioSecretDependencies = defaultDependencies) {
    const account = await dependencies.findAccount(input);
    if (!account) return { ok: false as const, error: "account_not_configured" as const };
    const config = audioConfig(account.providerConfig);
    if (!config || config.accessToken !== undefined || config.apiKey !== undefined) return { ok: false as const, error: "invalid_secret_references" as const };
    const metaRef = typeof config.metaAccessTokenSecret === "string" ? config.metaAccessTokenSecret : "";
    const openAIRef = typeof config.openAIApiKeySecret === "string" ? config.openAIApiKeySecret : "";
    const model = typeof config.openAIModel === "string" ? config.openAIModel.trim() : "gpt-4o-mini-transcribe";
    if (!SECRET_NAME.test(metaRef) || !SECRET_NAME.test(openAIRef) || !MODEL_NAME.test(model)) return { ok: false as const, error: "invalid_secret_references" as const };
    const [metaAccessToken, openAIApiKey] = await Promise.all([dependencies.readSecret(metaRef), dependencies.readSecret(openAIRef)]);
    if (!metaAccessToken || !openAIApiKey) return { ok: false as const, error: "secret_unavailable" as const };
    return { ok: true as const, secrets: { metaAccessToken, openAIApiKey, openAIModel: model } satisfies WhatsAppAudioSecrets };
  }
}
