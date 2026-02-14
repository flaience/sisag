import { formatPtBr } from "@/lib/time";

export class MessageComposer {
  help() {
    return [
      "🤖 Posso te ajudar com:",
      "• Agendar: “agendar amanhã 10”",
      "• Cancelar: “cancelar”",
      "",
      "Escreva o que você precisa 🙂",
    ].join("\n");
  }

  askMissingDateTime() {
    return "Certo! Qual dia e horário você prefere? Ex: “amanhã 10:00”.";
  }

  cancelAck() {
    return "Entendi. Vou localizar seu agendamento para cancelamento. ✅";
  }

  unknown() {
    return "Não entendi 😅. Digite “ajuda” para ver exemplos.";
  }

  createdOk(params: {
    scheduledIsoUtc: string;
    protocol: string;
    professionalName?: string | null;
  }) {
    const when = formatPtBr(params.scheduledIsoUtc);
    return [
      "✅ Agendamento criado!",
      params.professionalName
        ? `🩺 Profissional: ${params.professionalName}`
        : null,
      `📅 Data/hora: ${when}`,
      `🧾 Protocolo: ${params.protocol}`,
      "",
      "Para cancelar: responda *CANCELAR*",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
