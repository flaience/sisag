import { readFile } from "node:fs/promises";
import { OpenAIAudioTranscriber } from "@/modules/assistant/audio/OpenAIAudioTranscriber";
import { transcribeWhatsAppAudioHomologation } from "./WhatsAppAudioHomologationTranscription.service";

type Dependencies = {
  readApiKey: () => Promise<string | null>;
  transcribe: (input: { bytes: Uint8Array; mimeType: string; language: string; timeoutMs: number }) => Promise<{ text: string; confidence?: number }>;
};

async function readOpenAIApiKey() {
  try { return (await readFile("/run/secrets/openai_api_key", "utf8")).trim() || null; }
  catch { return null; }
}

export async function runWhatsAppAudioHomologation(input: { bytes: Uint8Array; mimeType: string; durationSeconds?: number }, dependencies?: Dependencies) {
  let deps = dependencies;
  if (!deps) {
    const apiKey = await readOpenAIApiKey();
    if (!apiKey) return { ok: false as const, error: "openai_invalid_configuration" as const, policyVersion: "whatsapp_audio_v1" };
    let transcriber: OpenAIAudioTranscriber;
    try { transcriber = new OpenAIAudioTranscriber({ apiKey }); }
    catch { return { ok: false as const, error: "openai_invalid_configuration" as const, policyVersion: "whatsapp_audio_v1" }; }
    deps = { readApiKey: async () => apiKey, transcribe: value => transcriber.transcribe(value) };
  }
  const apiKey = await deps.readApiKey();
  if (!apiKey) return { ok: false as const, error: "openai_invalid_configuration" as const, policyVersion: "whatsapp_audio_v1" };
  return transcribeWhatsAppAudioHomologation(input, { transcribe: deps.transcribe });
}
