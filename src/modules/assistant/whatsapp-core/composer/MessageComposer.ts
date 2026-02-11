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

  unknown() {
    return "Não entendi 😅. Digite “ajuda” para ver exemplos.";
  }

  // depois você troca por dados reais do AppointmentService
  scheduleAck() {
    return "Perfeito! Vou confirmar seu agendamento e já te retorno. ✅";
  }

  cancelAck() {
    return "Entendi. Vou localizar seu agendamento para cancelamento. ✅";
  }
}
