import { transcribeAuthorizedWhatsAppAudio, type WhatsAppAudioDependencies } from "@/modules/assistant/audio/WhatsAppAudioTranscription";

type Input = { bytes: Uint8Array; mimeType: string; durationSeconds?: number };
type Dependencies = { transcribe: WhatsAppAudioDependencies["transcribe"] };

export async function transcribeWhatsAppAudioHomologation(input: Input, dependencies: Dependencies) {
  return transcribeAuthorizedWhatsAppAudio(
    {
      mediaId: "homologation-upload",
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
      voice: true,
    },
    {
      downloadByMediaId: async () => ({ bytes: input.bytes, mimeType: input.mimeType }),
      transcribe: dependencies.transcribe,
    },
  );
}
