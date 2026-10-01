export const WHATSAPP_AUDIO_POLICY = {
  version: "whatsapp_audio_v1",
  maximumBytes: 10 * 1024 * 1024,
  maximumDurationSeconds: 180,
  timeoutMs: 20_000,
  language: "pt-BR",
  allowedMimeTypes: ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr"],
} as const;

export type WhatsAppAudioDescriptor = { mediaId: string; mimeType: string; durationSeconds?: number; voice?: boolean };
export type AuthorizedAudioDownload = { bytes: Uint8Array; mimeType: string };
export type WhatsAppAudioDependencies = {
  downloadByMediaId: (mediaId: string, maximumBytes: number) => Promise<AuthorizedAudioDownload>;
  transcribe: (input: { bytes: Uint8Array; mimeType: string; language: string; timeoutMs: number }) => Promise<{ text: string; confidence?: number }>;
};

export type WhatsAppAudioError =
  | "invalid_media_id" | "unsupported_audio_type" | "audio_too_long" | "audio_too_large" | "empty_transcription"
  | "meta_invalid_configuration" | "meta_metadata_http_error" | "meta_metadata_invalid" | "meta_media_host_not_allowed"
  | "meta_media_http_error" | "meta_media_type_mismatch" | "meta_media_empty" | "meta_network_error"
  | "openai_invalid_configuration" | "openai_invalid_audio" | "openai_auth_error" | "openai_quota_exhausted"
  | "openai_rate_limited" | "openai_provider_http_error" | "openai_invalid_response" | "openai_network_error"
  | "transcription_failed";

export type WhatsAppAudioResult =
  | { ok: true; text: string; confidence: number | null; policyVersion: string }
  | { ok: false; error: WhatsAppAudioError; policyVersion: string };

const cleanMime = (value: string) => value.split(";", 1)[0].trim().toLowerCase();
const metaErrors: Record<string, WhatsAppAudioError> = {
  invalid_configuration: "meta_invalid_configuration", metadata_http_error: "meta_metadata_http_error",
  metadata_invalid: "meta_metadata_invalid", media_host_not_allowed: "meta_media_host_not_allowed",
  media_too_large: "audio_too_large", media_http_error: "meta_media_http_error",
  media_type_mismatch: "meta_media_type_mismatch", media_empty: "meta_media_empty", network_error: "meta_network_error",
};
const openAIErrors: Record<string, WhatsAppAudioError> = {
  invalid_configuration: "openai_invalid_configuration", invalid_audio: "openai_invalid_audio",
  provider_auth_error: "openai_auth_error", provider_quota_exhausted: "openai_quota_exhausted",
  provider_rate_limited: "openai_rate_limited", provider_http_error: "openai_provider_http_error",
  provider_invalid_response: "openai_invalid_response", network_error: "openai_network_error",
};

export function classifyWhatsAppAudioFailure(error: unknown): WhatsAppAudioError {
  if (!error || typeof error !== "object") return "transcription_failed";
  const value = error as { name?: unknown; code?: unknown };
  if (typeof value.code !== "string") return "transcription_failed";
  if (value.name === "MetaMediaDownloadError") return metaErrors[value.code] ?? "transcription_failed";
  if (value.name === "OpenAIAudioTranscriptionError") return openAIErrors[value.code] ?? "transcription_failed";
  return "transcription_failed";
}

export async function transcribeAuthorizedWhatsAppAudio(descriptor: WhatsAppAudioDescriptor, deps: WhatsAppAudioDependencies): Promise<WhatsAppAudioResult> {
  const policy = WHATSAPP_AUDIO_POLICY;
  const fail = (error: WhatsAppAudioError): WhatsAppAudioResult => ({ ok: false, error, policyVersion: policy.version });
  if (!/^[A-Za-z0-9._:-]{1,255}$/.test(descriptor.mediaId)) return fail("invalid_media_id");
  const declaredMime = cleanMime(descriptor.mimeType);
  if (!policy.allowedMimeTypes.includes(declaredMime as typeof policy.allowedMimeTypes[number])) return fail("unsupported_audio_type");
  if (descriptor.durationSeconds !== undefined && (!Number.isFinite(descriptor.durationSeconds) || descriptor.durationSeconds < 0 || descriptor.durationSeconds > policy.maximumDurationSeconds)) return fail("audio_too_long");
  try {
    const media = await deps.downloadByMediaId(descriptor.mediaId, policy.maximumBytes);
    if (media.bytes.byteLength === 0) return fail("empty_transcription");
    if (media.bytes.byteLength > policy.maximumBytes) return fail("audio_too_large");
    const actualMime = cleanMime(media.mimeType);
    if (actualMime !== declaredMime || !policy.allowedMimeTypes.includes(actualMime as typeof policy.allowedMimeTypes[number])) return fail("unsupported_audio_type");
    const result = await deps.transcribe({ bytes: media.bytes, mimeType: actualMime, language: policy.language, timeoutMs: policy.timeoutMs });
    const text = result.text.trim();
    if (!text) return fail("empty_transcription");
    return { ok: true, text, confidence: typeof result.confidence === "number" && Number.isFinite(result.confidence) ? Math.min(1, Math.max(0, result.confidence)) : null, policyVersion: policy.version };
  } catch (error) {
    return fail(classifyWhatsAppAudioFailure(error));
  }
}
