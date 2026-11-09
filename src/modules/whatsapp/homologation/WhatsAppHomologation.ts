import { WhatsAppHomologationMessageSchema, type WhatsAppHomologationEnvelope } from "./WhatsAppHomologation.schema";

export function createWhatsAppHomologationEnvelope(input: unknown): WhatsAppHomologationEnvelope | null {
  const parsed = WhatsAppHomologationMessageSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    mode: "homologation",
    transport: "internal",
    externalDispatchAllowed: false,
    message: parsed.data,
  };
}
