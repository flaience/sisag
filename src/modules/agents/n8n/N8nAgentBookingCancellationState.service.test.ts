import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const source = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationState.service.ts", "utf8");
describe("n8n agent booking cancellation state", () => {
  it("uses a short confirmation lifetime", () => expect(source).toContain("10 * 60 * 1000"));
  it("stores only a hashed sender identity", () => { expect(source).toContain('createHash("sha256")'); expect(source).toContain("senderKey: identity"); expect(source).not.toContain("senderPhoneE164: input.senderPhoneE164"); });
  it("keeps cancellation execution outside this foundation", () => expect(source).not.toContain("cancelAppointment"));
});
