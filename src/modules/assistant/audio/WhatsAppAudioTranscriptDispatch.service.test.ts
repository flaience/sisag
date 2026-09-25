import { describe, expect, it, vi } from "vitest";
import { WhatsAppAudioTranscriptDispatchService as Service, type WhatsAppAudioTranscriptDispatchDependencies } from "./WhatsAppAudioTranscriptDispatch.service";

const now = new Date("2026-09-25T15:00:00Z");
const deps = (): WhatsAppAudioTranscriptDispatchDependencies => ({
  listCandidates: vi.fn(async () => [{ id: "audio-A", companyId: "company-A" }]),
  claim: vi.fn(async () => ({ id: "audio-A", companyId: "company-A", providerMessageId: "wamid-A", transcript: "agendar amanhã às dez", leaseToken: "lease-A" })),
  findPhone: vi.fn(async () => "+5511999999999"),
  dispatch: vi.fn(async () => ({ ok: true })),
  complete: vi.fn(async () => true),
  fail: vi.fn(async () => true),
});

describe("WhatsApp audio transcript dispatch", () => {
  it("dispatches the transcript with the original tenant, phone and message identity", async () => {
    const d = deps();
    await expect(Service.run({ batchSize: 999, now }, d)).resolves.toEqual({ ok: true, scanned: 1, dispatched: 1, retryPending: 0 });
    expect(d.listCandidates).toHaveBeenCalledWith({ now, batchSize: 20 });
    expect(d.dispatch).toHaveBeenCalledExactlyOnceWith({ companyId: "company-A", phone: "+5511999999999", text: "agendar amanhã às dez", correlationId: "wamid-A" });
    expect(d.complete).toHaveBeenCalledWith({ id: "audio-A", companyId: "company-A", leaseToken: "lease-A", now });
  });

  it("releases the lease for controlled retry when identity or assistant processing fails", async () => {
    const missing = deps();
    vi.mocked(missing.findPhone).mockResolvedValue(null);
    await expect(Service.run({ batchSize: 10, now }, missing)).resolves.toMatchObject({ dispatched: 0, retryPending: 1 });
    expect(missing.dispatch).not.toHaveBeenCalled();
    expect(missing.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "inbound_identity_missing", leaseToken: "lease-A" }));
    const failed = deps();
    vi.mocked(failed.dispatch).mockResolvedValue({ ok: false });
    await Service.run({ batchSize: 10, now }, failed);
    expect(failed.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "assistant_dispatch_failed" }));
  });

  it("does not dispatch work that another runner already claimed", async () => {
    const d = deps();
    vi.mocked(d.claim).mockResolvedValue(null);
    await expect(Service.run({ batchSize: 10, now }, d)).resolves.toEqual({ ok: true, scanned: 1, dispatched: 0, retryPending: 0 });
    expect(d.dispatch).not.toHaveBeenCalled();
  });
});
