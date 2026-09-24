import { MetaWhatsAppMediaDownloader } from "./MetaWhatsAppMediaDownloader";
import {
  transcribeAuthorizedWhatsAppAudio,
  type WhatsAppAudioResult,
} from "./WhatsAppAudioTranscription";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
type Transcribe = (input: {
  bytes: Uint8Array;
  mimeType: string;
  language: string;
  timeoutMs: number;
}) => Promise<{ text: string; confidence?: number }>;

export type MetaWhatsAppAudioInput = {
  accessToken: string;
  media: {
    mediaId: string;
    mimeType: string | null;
    voice: boolean;
  };
};

export type MetaWhatsAppAudioDependencies = {
  fetch: FetchLike;
  transcribe: Transcribe;
};

export async function orchestrateMetaWhatsAppAudio(
  input: MetaWhatsAppAudioInput,
  dependencies: MetaWhatsAppAudioDependencies,
): Promise<WhatsAppAudioResult> {
  const policyVersion = "whatsapp_audio_v1";
  if (!input.media.mimeType) {
    return { ok: false, error: "unsupported_audio_type", policyVersion };
  }

  let downloader: MetaWhatsAppMediaDownloader;
  try {
    downloader = new MetaWhatsAppMediaDownloader({
      accessToken: input.accessToken,
      fetch: dependencies.fetch,
    });
  } catch {
    return { ok: false, error: "transcription_failed", policyVersion };
  }

  return transcribeAuthorizedWhatsAppAudio(
    {
      mediaId: input.media.mediaId,
      mimeType: input.media.mimeType,
      voice: input.media.voice,
    },
    {
      downloadByMediaId: (mediaId, maximumBytes) =>
        downloader.downloadByMediaId(mediaId, maximumBytes),
      transcribe: dependencies.transcribe,
    },
  );
}
