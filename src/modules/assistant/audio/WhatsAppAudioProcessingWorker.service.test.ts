import { describe, expect, it, vi } from "vitest";
import { WhatsAppAudioProcessingWorkerService as Worker, type WhatsAppAudioWorkerDependencies } from "./WhatsAppAudioProcessingWorker.service";

const candidates = [
  { id: "one", companyId: "company-A", whatsappAccountId: "account-A" },
  { id: "two", companyId: "company-B", whatsappAccountId: "account-B" },
];
const dependencies = (): WhatsAppAudioWorkerDependencies => ({
  listCandidates: vi.fn(async () => candidates),
  resolveSecrets: vi.fn(async () => ({ ok: true, secrets: { metaAccessToken: "meta", openAIApiKey: "openai", openAIModel: "gpt-4o-mini-transcribe" } })),
  runOne: vi.fn(async () => ({ ok: true, id: "processing", attempts: 1 })),
});

describe("WhatsApp audio processing worker", () => {
  it("processes a bounded batch sequentially with tenant-scoped secrets", async () => {
    const deps = dependencies();
    await expect(Worker.run({ batchSize: 999, now: new Date("2026-09-25T12:00:00Z") }, deps)).resolves.toEqual({ ok: true, scanned: 2, completed: 2, retryPending: 0, terminalFailed: 0, configurationSkipped: 0 });
    expect(deps.listCandidates).toHaveBeenCalledWith({ now: new Date("2026-09-25T12:00:00Z"), batchSize: 20 });
    expect(deps.resolveSecrets).toHaveBeenNthCalledWith(1, { companyId: "company-A", whatsappAccountId: "account-A" });
    expect(deps.runOne).toHaveBeenNthCalledWith(1, expect.objectContaining({ companyId: "company-A", processingId: "one", metaAccessToken: "meta" }));
  });

  it("skips unconfigured accounts without exposing their identities", async () => {
    const deps = dependencies();
    vi.mocked(deps.resolveSecrets).mockResolvedValue({ ok: false, error: "secret_unavailable" });
    const result = await Worker.run({ batchSize: 10 }, deps);
    expect(result).toEqual({ ok: true, scanned: 2, completed: 0, retryPending: 0, terminalFailed: 0, configurationSkipped: 2 });
    expect(deps.runOne).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("company-");
  });

  it("summarizes retryable and terminal outcomes without leaking provider errors", async () => {
    const deps = dependencies();
    vi.mocked(deps.runOne).mockResolvedValueOnce({ ok: false, error: "transcription_failed", status: "pending" }).mockResolvedValueOnce({ ok: false, error: "unsupported_audio_type", status: "failed" });
    await expect(Worker.run({ batchSize: 10 }, deps)).resolves.toEqual({ ok: true, scanned: 2, completed: 0, retryPending: 1, terminalFailed: 1, configurationSkipped: 0 });
  });

  it("continues the batch after one isolated dependency failure", async () => {
    const deps = dependencies();
    vi.mocked(deps.runOne).mockRejectedValueOnce(new Error("private")).mockResolvedValueOnce({ ok: true, id: "two", attempts: 1 });
    await expect(Worker.run({ batchSize: 10 }, deps)).resolves.toEqual({ ok: true, scanned: 2, completed: 1, retryPending: 1, terminalFailed: 0, configurationSkipped: 0 });
  });
});
