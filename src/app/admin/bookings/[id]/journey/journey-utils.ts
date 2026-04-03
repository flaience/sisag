export function getErrorMessage(response: any, fallback: string) {
  return response?.message ?? response?.error ?? fallback;
}

export async function writeToClipboard(text?: string) {
  if (!text) {
    throw new Error("Mensagem não disponível para cópia.");
  }

  await navigator.clipboard.writeText(text);
}

export function buildWhatsAppLink(phone?: string | null, text?: string) {
  if (!phone || !text) return null;

  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone) return null;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
