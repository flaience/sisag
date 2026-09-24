import { orchestrateMetaWhatsAppAudio } from "./MetaWhatsAppAudioOrchestrator";
import { OpenAIAudioTranscriber } from "./OpenAIAudioTranscriber";
import { WhatsAppAudioProcessingService } from "./WhatsAppAudioProcessing.service";

type Claim = { ok: true; id: string; mediaId: string; mimeType: string | null; attempts: number; leaseToken: string | null } | { ok: false; error: string };
type Result = { ok: true; text: string; confidence: number | null; policyVersion: string } | { ok: false; error: string; policyVersion: string };

export type WhatsAppAudioRunnerDependencies = {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
  claim: (input: { companyId: string; id: string }) => Promise<Claim>;
  complete: (input: { companyId: string; id: string; leaseToken: string; transcript: string; confidence: number | null; policyVersion: string }) => Promise<{ ok: boolean; error?: string }>;
  fail: (input: { companyId: string; id: string; leaseToken: string; errorCode: string; retryable: boolean }) => Promise<{ ok: boolean; status?: string; error?: string }>;
  orchestrate: typeof orchestrateMetaWhatsAppAudio;
};

export const defaultWhatsAppAudioRunnerDependencies = (fetcher: WhatsAppAudioRunnerDependencies["fetch"]): WhatsAppAudioRunnerDependencies => ({
  fetch: fetcher,
  claim: (input) => WhatsAppAudioProcessingService.claim(input),
  complete: (input) => WhatsAppAudioProcessingService.complete(input),
  fail: (input) => WhatsAppAudioProcessingService.fail(input),
  orchestrate: orchestrateMetaWhatsAppAudio,
});

const retryableErrors = new Set(["transcription_failed"]);

export class WhatsAppAudioProcessingRunner {
  static async run(input: {
    companyId: string;
    processingId: string;
    metaAccessToken: string;
    openAIApiKey: string;
    openAIModel?: string;
  }, dependencies: WhatsAppAudioRunnerDependencies) {
    const metaAccessToken = input.metaAccessToken.trim();
    if (!metaAccessToken || !input.openAIApiKey.trim()) return { ok: false as const, error: "invalid_configuration" as const };

    let transcriber: OpenAIAudioTranscriber;
    try {
      transcriber = new OpenAIAudioTranscriber({ apiKey: input.openAIApiKey, model: input.openAIModel, fetch: dependencies.fetch });
    } catch {
      return { ok: false as const, error: "invalid_configuration" as const };
    }

    const claimed = await dependencies.claim({ companyId: input.companyId, id: input.processingId });
    if (!claimed.ok || !claimed.leaseToken) return { ok: false as const, error: "not_claimable" as const };

    let result: Result;
    try {
      result = await dependencies.orchestrate({
        accessToken: metaAccessToken,
        media: { mediaId: claimed.mediaId, mimeType: claimed.mimeType, voice: false },
      }, {
        fetch: dependencies.fetch,
        transcribe: (audio) => transcriber.transcribe(audio),
      });
    } catch {
      result = { ok: false, error: "runner_failed", policyVersion: "whatsapp_audio_v1" };
    }

    if (result.ok === true) {
      const completed = await dependencies.complete({
        companyId: input.companyId,
        id: claimed.id,
        leaseToken: claimed.leaseToken,
        transcript: result.text,
        confidence: result.confidence,
        policyVersion: result.policyVersion,
      });
      return completed.ok ? { ok: true as const, id: claimed.id, attempts: claimed.attempts } : { ok: false as const, error: "lease_lost" as const };
    }

    const failure = result as Extract<Result, { ok: false }>;
    const failed = await dependencies.fail({
      companyId: input.companyId,
      id: claimed.id,
      leaseToken: claimed.leaseToken,
      errorCode: failure.error,
      retryable: retryableErrors.has(failure.error) || failure.error === "runner_failed",
    });
    return failed.ok
      ? { ok: false as const, error: failure.error, status: failed.status ?? "pending" }
      : { ok: false as const, error: "lease_lost" as const };
  }
}
