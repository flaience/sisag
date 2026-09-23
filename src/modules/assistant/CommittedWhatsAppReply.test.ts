import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rows: [] as unknown[], read: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: async () => { state.read(); return state.rows; } }) }) }) }) }));
import { hasCommittedWhatsAppReply } from "./CommittedWhatsAppReply";
const input = { companyId: "company-a", phone: "fictional-a", correlationId: "message-a" };
const receipt = { eventType: "whatsapp.send.requested", payload: { companyId: input.companyId, toPhone: input.phone, correlationId: input.correlationId } };
beforeEach(() => { state.rows = []; vi.clearAllMocks(); });
describe("committed WhatsApp processing receipt", () => {
  it("does not infer a receipt without provider identity", async () => {
    expect(await hasCommittedWhatsAppReply({ ...input, correlationId: null })).toBe(false);
    expect(state.read).not.toHaveBeenCalled();
  });
  it("allows a message without an existing receipt", async () => { expect(await hasCommittedWhatsAppReply(input)).toBe(false); });
  it("recognizes the exact company, phone and message", async () => { state.rows = [receipt]; expect(await hasCommittedWhatsAppReply(input)).toBe(true); });
  it.each([
    { ...receipt, eventType: "another.event" },
    { ...receipt, payload: null },
    { ...receipt, payload: { ...receipt.payload, companyId: "company-b" } },
    { ...receipt, payload: { ...receipt.payload, toPhone: "fictional-b" } },
    { ...receipt, payload: { ...receipt.payload, correlationId: "message-b" } },
  ])("fails closed on an incompatible receipt %#", async row => {
    state.rows = [row];
    await expect(hasCommittedWhatsAppReply(input)).rejects.toThrow("inbound_receipt_identity_conflict");
  });
});
