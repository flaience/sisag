import { describe, expect, it, vi } from "vitest";
import { WhatsAppAudioProcessingRunner as Runner, type WhatsAppAudioRunnerDependencies } from "./WhatsAppAudioProcessingRunner";

const input = { companyId: "company-A", processingId: "processing-A", metaAccessToken: "meta-secret", openAIApiKey: "openai-secret" };
const dependencies = (): WhatsAppAudioRunnerDependencies => ({
  fetch: vi.fn(),
  claim: vi.fn(async () => ({ ok: true, id: "processing-A", mediaId: "media-A", mimeType: "audio/ogg", attempts: 1, leaseToken: "lease-A" })),
  complete: vi.fn(async () => ({ ok: true })),
  fail: vi.fn(async () => ({ ok: true, status: "pending" })),
  orchestrate: vi.fn(async () => ({ ok: true, text: "agendar amanhã", confidence: 0.9, policyVersion: "whatsapp_audio_v1" })),
});

describe("WhatsApp audio processing runner", () => {
  it("claims, transcribes and completes using the same tenant and lease", async () => {
    const deps = dependencies();
    await expect(Runner.run(input, deps)).resolves.toEqual({ ok: true, id: "processing-A", attempts: 1 });
    expect(deps.claim).toHaveBeenCalledExactlyOnceWith({ companyId: "company-A", id: "processing-A" });
    expect(deps.orchestrate).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "meta-secret", media: expect.objectContaining({ mediaId: "media-A" }) }), expect.anything());
    expect(deps.complete).toHaveBeenCalledExactlyOnceWith({ companyId: "company-A", id: "processing-A", leaseToken: "lease-A", transcript: "agendar amanhã", confidence: 0.9, policyVersion: "whatsapp_audio_v1" });
    expect(deps.fail).not.toHaveBeenCalled();
  });

  it("rejects missing credentials before acquiring work", async () => {
    const deps = dependencies();
    await expect(Runner.run({ ...input, openAIApiKey: "" }, deps)).resolves.toEqual({ ok: false, error: "invalid_configuration" });
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.orchestrate).not.toHaveBeenCalled();
  });

  it("returns deterministic media failures as terminal", async () => {
    const deps = dependencies();
    vi.mocked(deps.orchestrate).mockResolvedValue({ ok: false, error: "unsupported_audio_type", policyVersion: "whatsapp_audio_v1" });
    vi.mocked(deps.fail).mockResolvedValue({ ok: true, status: "failed" });
    await expect(Runner.run(input, deps)).resolves.toEqual({ ok: false, error: "unsupported_audio_type", status: "failed" });
    expect(deps.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "unsupported_audio_type", retryable: false, leaseToken: "lease-A" }));
    expect(deps.complete).not.toHaveBeenCalled();
  });

  it("releases transient provider failures for a controlled retry", async () => {
    const deps = dependencies();
    vi.mocked(deps.orchestrate).mockResolvedValue({ ok: false, error: "transcription_failed", policyVersion: "whatsapp_audio_v1" });
    await expect(Runner.run(input, deps)).resolves.toEqual({ ok: false, error: "transcription_failed", status: "pending" });
    expect(deps.fail).toHaveBeenCalledWith(expect.objectContaining({ retryable: true }));
  });

  it("fails closed when the lease cannot be acquired or finalized", async () => {
    const notClaimed = dependencies();
    vi.mocked(notClaimed.claim).mockResolvedValue({ ok: false, error: "not_claimable" });
    await expect(Runner.run(input, notClaimed)).resolves.toEqual({ ok: false, error: "not_claimable" });
    const lost = dependencies();
    vi.mocked(lost.complete).mockResolvedValue({ ok: false, error: "lease_lost" });
    await expect(Runner.run(input, lost)).resolves.toEqual({ ok: false, error: "lease_lost" });
  });
});
