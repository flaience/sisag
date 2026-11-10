import { describe, expect, it } from "vitest";
import { composeWhatsAppHomologationTurn } from "./WhatsAppHomologationConversationContext";

describe("whatsapp homologation conversation context", () => {
  it("keeps the first turn unchanged", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "Quero marcar uma consulta" })).toBe("Quero marcar uma consulta");
  });

  it("composes only the immediately previous exchange", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "15/11 às 10:00", context: { priorUserText: "Quero marcar uma consulta", priorAssistantText: "Qual data e horário você prefere?" } })).toBe("Solicitação anterior: Quero marcar uma consulta\nResposta anterior do agente: Qual data e horário você prefere?\nContinuação do cliente: 15/11 às 10:00");
  });

  it("removes line breaks that could expand the transcript", () => {
    expect(composeWhatsAppHomologationTurn({ currentText: "15/11\n10:00", context: { priorUserText: "Quero\nmarcar", priorAssistantText: "Qual data?" } })).not.toContain("Quero\nmarcar");
  });
});
