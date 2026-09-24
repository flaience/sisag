export const OPENAI_AUDIO_TRANSCRIPTION_POLICY = {
  version: "openai_audio_transcription_v1",
  endpoint: "https://api.openai.com/v1/audio/transcriptions",
  defaultModel: "gpt-4o-mini-transcribe",
  maximumResponseCharacters: 20_000,
} as const;

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type AudioTranscriptionInput = {
  bytes: Uint8Array;
  mimeType: string;
  language: string;
  timeoutMs: number;
};

export type AudioTranscriptionOutput = { text: string; confidence?: number };
export type OpenAIAudioTranscriptionErrorCode =
  | "invalid_configuration"
  | "invalid_audio"
  | "provider_http_error"
  | "provider_invalid_response"
  | "network_error";

export class OpenAIAudioTranscriptionError extends Error {
  constructor(readonly code: OpenAIAudioTranscriptionErrorCode) {
    super(code);
    this.name = "OpenAIAudioTranscriptionError";
  }
}

const extensions: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
};
const cleanMime = (value: string) => value.split(";", 1)[0].trim().toLowerCase();
const cleanLanguage = (value: string) => value.trim().toLowerCase().split("-", 1)[0];

export class OpenAIAudioTranscriber {
  private readonly apiKey: string;
  private readonly fetcher: FetchLike;
  private readonly model: string;

  constructor(options: { apiKey: string; fetch?: FetchLike; model?: string }) {
    this.apiKey = options.apiKey.trim();
    this.fetcher = options.fetch ?? fetch;
    this.model = (options.model ?? OPENAI_AUDIO_TRANSCRIPTION_POLICY.defaultModel).trim();
    if (!this.apiKey || !/^[A-Za-z0-9._:-]{1,100}$/.test(this.model)) {
      throw new OpenAIAudioTranscriptionError("invalid_configuration");
    }
  }

  async transcribe(input: AudioTranscriptionInput): Promise<AudioTranscriptionOutput> {
    const mimeType = cleanMime(input.mimeType);
    const extension = extensions[mimeType];
    const language = cleanLanguage(input.language);
    if (!input.bytes.byteLength || !extension || !/^[a-z]{2,3}$/.test(language) ||
        !Number.isSafeInteger(input.timeoutMs) || input.timeoutMs < 1) {
      throw new OpenAIAudioTranscriptionError("invalid_audio");
    }

    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(input.bytes)], { type: mimeType }), "whatsapp-audio." + extension);
    form.set("model", this.model);
    form.set("language", language);
    form.set("response_format", "json");

    try {
      const response = await this.fetcher(OPENAI_AUDIO_TRANSCRIPTION_POLICY.endpoint, {
        method: "POST",
        headers: { authorization: "Bearer " + this.apiKey },
        body: form,
        redirect: "error",
        signal: AbortSignal.timeout(input.timeoutMs),
      });
      if (!response.ok) throw new OpenAIAudioTranscriptionError("provider_http_error");
      const payload = await response.json() as { text?: unknown };
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (!text || text.length > OPENAI_AUDIO_TRANSCRIPTION_POLICY.maximumResponseCharacters) {
        throw new OpenAIAudioTranscriptionError("provider_invalid_response");
      }
      return { text };
    } catch (error) {
      if (error instanceof OpenAIAudioTranscriptionError) throw error;
      throw new OpenAIAudioTranscriptionError("network_error");
    }
  }
}
