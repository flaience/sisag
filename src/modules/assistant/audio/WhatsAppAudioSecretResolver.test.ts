import { describe, expect, it, vi } from "vitest";
import { dockerSecretPath, WhatsAppAudioSecretResolver as Resolver, type WhatsAppAudioSecretDependencies } from "./WhatsAppAudioSecretResolver";

const input = { companyId: "company-A", whatsappAccountId: "account-A" };
const config = { audioProcessing: { metaAccessTokenSecret: "wa_cloud_token_prod", openAIApiKeySecret: "openai_api_key", openAIModel: "gpt-4o-mini-transcribe" } };
const dependencies = (providerConfig: unknown = config): WhatsAppAudioSecretDependencies => ({
  findAccount: vi.fn(async () => ({ providerConfig })),
  readSecret: vi.fn(async (name) => name === "wa_cloud_token_prod" ? "meta-secret" : "openai-secret"),
});

describe("WhatsApp audio secret resolver", () => {
  it("resolves references only after a tenant-scoped account lookup", async () => {
    const deps = dependencies();
    await expect(Resolver.resolve(input, deps)).resolves.toEqual({ ok: true, secrets: { metaAccessToken: "meta-secret", openAIApiKey: "openai-secret", openAIModel: "gpt-4o-mini-transcribe" } });
    expect(deps.findAccount).toHaveBeenCalledExactlyOnceWith(input);
    expect(vi.mocked(deps.readSecret).mock.calls.map(call => call[0])).toEqual(["wa_cloud_token_prod", "openai_api_key"]);
  });

  it.each(["../secret", "/run/secrets/x", "x/y", "X_UPPER", "", "a".repeat(65)])("rejects arbitrary secret reference %s", async (name) => {
    const deps = dependencies({ audioProcessing: { ...config.audioProcessing, metaAccessTokenSecret: name } });
    await expect(Resolver.resolve(input, deps)).resolves.toEqual({ ok: false, error: "invalid_secret_references" });
    expect(deps.readSecret).not.toHaveBeenCalled();
    expect(dockerSecretPath(name)).toBeNull();
  });

  it("rejects raw credentials in provider configuration", async () => {
    const deps = dependencies({ audioProcessing: { ...config.audioProcessing, accessToken: "raw-secret" } });
    await expect(Resolver.resolve(input, deps)).resolves.toEqual({ ok: false, error: "invalid_secret_references" });
    expect(deps.readSecret).not.toHaveBeenCalled();
  });

  it("fails closed for missing account or unavailable secret", async () => {
    const missing = dependencies();
    vi.mocked(missing.findAccount).mockResolvedValue(null);
    await expect(Resolver.resolve(input, missing)).resolves.toEqual({ ok: false, error: "account_not_configured" });
    const unavailable = dependencies();
    vi.mocked(unavailable.readSecret).mockResolvedValue(null);
    await expect(Resolver.resolve(input, unavailable)).resolves.toEqual({ ok: false, error: "secret_unavailable" });
  });

  it("uses only the fixed Docker Secrets directory", () => {
    expect(dockerSecretPath("openai_api_key")).toBe("/run/secrets/openai_api_key");
  });
});
