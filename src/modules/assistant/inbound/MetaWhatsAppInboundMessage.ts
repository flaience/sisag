export type MetaWhatsAppInboundMessage =
  | { kind: "text"; providerMessageId: string; fromPhone: string; text: string }
  | {
      kind: "audio";
      providerMessageId: string;
      fromPhone: string;
      audio: { mediaId: string; mimeType: string | null; voice: boolean };
    };

const nonEmpty = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export function parseMetaWhatsAppInboundMessage(
  input: unknown,
): MetaWhatsAppInboundMessage | null {
  if (!input || typeof input !== "object") return null;
  const message = input as Record<string, unknown>;
  const providerMessageId = nonEmpty(message.id);
  const from = nonEmpty(message.from);
  const type = nonEmpty(message.type);
  if (!providerMessageId || !from || !type || !/^\d{7,20}$/.test(from)) return null;
  const fromPhone = `+${from}`;

  if (type === "text") {
    const textObject = message.text;
    if (!textObject || typeof textObject !== "object") return null;
    const text = nonEmpty((textObject as Record<string, unknown>).body);
    return text ? { kind: "text", providerMessageId, fromPhone, text } : null;
  }

  if (type === "audio") {
    const audioObject = message.audio;
    if (!audioObject || typeof audioObject !== "object") return null;
    const audio = audioObject as Record<string, unknown>;
    const mediaId = nonEmpty(audio.id);
    if (!mediaId) return null;
    return {
      kind: "audio",
      providerMessageId,
      fromPhone,
      audio: {
        mediaId,
        mimeType: nonEmpty(audio.mime_type),
        voice: audio.voice === true,
      },
    };
  }

  return null;
}
