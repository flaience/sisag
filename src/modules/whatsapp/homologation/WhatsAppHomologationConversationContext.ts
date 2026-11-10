type Input = { currentText: string; context?: { priorUserText?: string; priorAssistantText?: string } };

const oneLine = (value: string, limit: number) => value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

export function composeWhatsAppHomologationTurn(input: Input) {
  const current = oneLine(input.currentText, 4096);
  if (!input.context?.priorUserText || !input.context.priorAssistantText) return current;
  const priorAssistant = oneLine(input.context.priorAssistantText, 500);
  const normalizedAssistant = priorAssistant.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizedCurrent = current.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const choosesOfferedSlot = /horarios disponiveis/.test(normalizedAssistant) && (/(?:^|\s)(?:primeir[oa]|segund[oa]|terceir[oa]|ultim[oa])(?:$|\s|[.,!?])/.test(normalizedCurrent) || /(?:^|\s)([01]?\d|2[0-3])(?::[0-5]\d|h)(?:$|\s|[.,!?])/.test(normalizedCurrent));
  return [
    `Solicitação anterior: ${oneLine(input.context.priorUserText, 4096)}`,
    `Resposta anterior do agente: ${priorAssistant}`,
    `${choosesOfferedSlot ? "Escolha de horário do cliente" : "Continuação do cliente"}: ${current}`,
  ].join("\n");
}
