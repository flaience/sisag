import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologationShadowDecision.service.ts", "utf8");

describe("whatsapp homologation shared ingress boundary", () => {
  it("enters the same agent contract used by production channels", () => {
    expect(service).toContain("createN8nAgentChannelIngressMessage");
    expect(service).toContain('source: "homologation"');
    expect(service).toContain("dependencies.mirror(ingress.mirrorInput)");
  });

  it("does not create a second decision or scheduling implementation", () => {
    expect(service).not.toContain("AssistantWhatsAppService");
    expect(service).not.toContain("getDb(");
    expect(service).not.toContain("scheduling.find_available_slots");
  });
});
