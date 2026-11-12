import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentSharedResultRouter.service.ts", "utf8");

describe("n8n agent shared result router foundation boundary", () => {
  it("keeps the established routing precedence in one channel-independent service", () => {
    const markers = ["routeHandoff", "routeCancellation", "routeRescheduling", "routeBooking", "routeAnswer"];
    for (const marker of markers) expect(source).toContain(marker);
    for (let index = 1; index < markers.length; index += 1) expect(source.indexOf(markers[index - 1], source.indexOf("export async function"))).toBeLessThan(source.indexOf(markers[index], source.indexOf("export async function")));
  });

  it("does not capture transcribe persist scheduling or transport responsibilities", () => {
    for (const forbidden of ["AssistantWhatsAppService", "mirrorN8nAgentShadowMessage(", "getDb(", "executeBookingCommand", "transcrib"]) expect(source).not.toContain(forbidden);
  });
});
