import { describe, expect, it } from "vitest";
import { composeWhatsAppHomologationTurn } from "./WhatsAppHomologationConversationContext";

describe("whatsapp homologation conversation context", () => {
  it("keeps the first turn unchanged", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "Quero marcar uma consulta" })).toBe("Quero marcar uma consulta");
  });

  it("marks an ordinal after offered availability as a slot choice", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "Quero o primeiro horário", context: { priorUserText: "Quero marcar uma consulta em 16/11", priorAssistantText: "Sim. Encontrei horários disponíveis: 08:00, 08:15 e 08:30." } })).toContain("Escolha de horário do cliente: Quero o primeiro horário");
  });

  it("keeps a generic answer as a normal continuation", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "Consulta", context: { priorUserText: "Quero marcar", priorAssistantText: "Qual serviço você deseja?" } })).toContain("Continuação do cliente: Consulta");
  });

  it("removes line breaks that could expand the transcript", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "15/11\n10:00", context: { priorUserText: "Quero marcar", priorAssistantText: "Qual data?" } })).toContain("Continuação do cliente: 15/11 10:00");
  });
});
