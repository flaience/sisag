import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  assistant: vi.fn(), conversation: vi.fn(), account: vi.fn(), inbound: vi.fn(),
  event: vi.fn(), status: vi.fn(), applyStatus: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ ConversationTransactionError: class extends Error {} }));
vi.mock("@/modules/assistant/AssistantWhatsApp.service", () => ({ AssistantWhatsAppService: { handleInbound: m.assistant } }));
vi.mock("@/modules/conversation/ConversationEngine", () => ({ ConversationEngine: { process: m.conversation } }));
vi.mock("@/modules/whatsapp/whatsapp-webhook.service", () => ({ applyMetaMessageStatus: m.applyStatus }));
vi.mock("@/modules/whatsapp/meta-webhook-events.service", () => ({
  findMetaAccountByPhoneNumberId: m.account, saveMetaInboundMessage: m.inbound,
  saveMetaStatusEvent: m.status, saveMetaWebhookEvent: m.event,
}));
import { ConversationTransactionError } from "@/lib/db";
import { POST } from "./route";
const message = (id = "synthetic-message-1") => ({ id, from: "5500000000000", type: "text", text: { body: "SIM" } });
function request(messages = [message()]) {
  return new NextRequest("http://localhost/api/v1/whatsapp/webhook", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ entry: [{ changes: [{ field: "messages", value: {
      metadata: { phone_number_id: "synthetic-number" }, messages,
    } }] }] }),
  });
}
describe("inbound route contract — dependencies simulated, no HTTP transport", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("WHATSAPP_INBOUND_ENGINE", "assistant");
    vi.stubEnv("META_DEFAULT_COMPANY_ID", "");
    m.account.mockResolvedValue({ id: "account-A", companyId: "company-A" });
    m.inbound.mockResolvedValue({ ok: true, skipped: false });
    m.assistant.mockResolvedValue({ ok: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
  });
  afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it("passes account tenant and original message identity to assistant", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(m.assistant).toHaveBeenCalledExactlyOnceWith({ companyId: "company-A", phone: "+5500000000000", text: "SIM", correlationId: "synthetic-message-1" });
    expect(m.conversation).not.toHaveBeenCalled();
  });
  it("acknowledges an already committed reply without using the other engine", async () => {
    m.assistant.mockResolvedValue({ ok: true, replayed: true });
    expect((await POST(request())).status).toBe(200);
    expect(m.assistant).toHaveBeenCalledTimes(1);
    expect(m.conversation).not.toHaveBeenCalled();
  });
  it("returns sanitized 503 after transaction failure", async () => {
    m.assistant.mockRejectedValue(new ConversationTransactionError());
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "inbound_processing_failed" });
  });
  it("keeps the same identity when retrying after transaction failure", async () => {
    m.assistant.mockRejectedValueOnce(new ConversationTransactionError()).mockResolvedValueOnce({ ok: true });
    expect((await POST(request())).status).toBe(503);
    expect((await POST(request())).status).toBe(200);
    expect(m.assistant.mock.calls[0][0]).toEqual(m.assistant.mock.calls[1][0]);
  });
  it("does not skip assistant merely because inbound receipt already exists", async () => {
    m.inbound.mockResolvedValue({ ok: true, skipped: true });
    expect((await POST(request())).status).toBe(200);
    expect(m.assistant).toHaveBeenCalledTimes(1);
  });
  it("stops the remaining batch on transaction failure", async () => {
    m.assistant.mockRejectedValueOnce(new ConversationTransactionError());
    expect((await POST(request([message("first"), message("second")]))).status).toBe(503);
    expect(m.assistant).toHaveBeenCalledTimes(1);
  });
  it("does not invoke assistant without a mapped tenant or fallback", async () => {
    m.account.mockResolvedValue(null);
    await POST(request());
    expect(m.assistant).not.toHaveBeenCalled();
  });
  it("returns sanitized 503 when receipt storage fails before assistant", async () => {
    m.inbound.mockRejectedValue(new Error("synthetic-storage-failure"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "inbound_processing_failed" });
    expect(m.assistant).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
  it("retries the original identity after receipt storage recovers", async () => {
    m.inbound.mockRejectedValueOnce(new Error("storage")).mockResolvedValueOnce({ ok: true, skipped: true });
    expect((await POST(request())).status).toBe(503);
    expect((await POST(request())).status).toBe(200);
    expect(m.assistant).toHaveBeenCalledTimes(1);
    expect(m.assistant.mock.calls[0][0].correlationId).toBe("synthetic-message-1");
  });
  it("replays a partially processed batch using the same message identities", async () => {
    m.inbound.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new Error("storage"));
    expect((await POST(request([message("first"), message("second")]))).status).toBe(503);
    expect(m.assistant).toHaveBeenCalledTimes(1);
    m.inbound.mockResolvedValue({ ok: true, skipped: true });
    m.assistant.mockResolvedValueOnce({ ok: true, replayed: true }).mockResolvedValueOnce({ ok: true });
    expect((await POST(request([message("first"), message("second")]))).status).toBe(200);
    expect(m.assistant.mock.calls.map(call => call[0].correlationId)).toEqual(["first", "first", "second"]);
  });
  it("does not extend receipt retries to the unvalidated legacy engine", async () => {
    vi.stubEnv("WHATSAPP_INBOUND_ENGINE", "conversation");
    m.inbound.mockRejectedValue(new Error("storage"));
    expect((await POST(request())).status).toBe(200);
    expect(m.conversation).not.toHaveBeenCalled();
  });
});
