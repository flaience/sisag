import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation foundation boundary", () => {
  const source = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologation.ts", "utf8");
  const schema = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologation.schema.ts", "utf8");

  it("is internal-only and denies external dispatch", () => {
    expect(schema).toContain('mode: z.literal("homologation")');
    expect(schema).toContain('transport: z.literal("internal")');
    expect(schema).toContain("externalDispatchAllowed: z.literal(false)");
  });

  it("does not call Meta n8n storage or message delivery", () => {
    for (const forbidden of ["graph.facebook.com", "fetch(", "getDb", "mirrorN8nAgentShadowMessage", "OutboxPublisher", "sendMessage"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
