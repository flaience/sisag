import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("WhatsApp audio secret resolution boundary", () => {
  const source = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioSecretResolver.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
  it("scopes account lookup to tenant, identity, provider and active state", () => {
    for (const value of ["whatsappAccounts.companyId", "whatsappAccounts.id", 'whatsappAccounts.provider, "meta"', 'whatsappAccounts.status, "active"']) expect(source).toContain(value);
  });
  it("accepts references but rejects raw secrets and arbitrary paths", () => {
    for (const value of ["metaAccessTokenSecret", "openAIApiKeySecret", "config.accessToken !== undefined", "config.apiKey !== undefined", '"/run/secrets/" + name']) expect(source).toContain(value);
    expect(source).not.toContain("console.");
  });
  it("does not expose credential resolution to the public webhook", () => {
    expect(route).not.toContain("WhatsAppAudioSecretResolver");
    expect(route).not.toContain("openAIApiKey");
    expect(route).not.toContain("metaAccessToken");
  });
});
