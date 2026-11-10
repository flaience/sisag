type Input = { currentText: string; context?: { priorUserText?: string; priorAssistantText?: string } };

const oneLine = (value: string, limit: number) => value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

export function composeWhatsAppHomologationTurn(input: Input) {
  const current = oneLine(input.currentText, 4096);
  if (!input.context?.priorUserText || !input.context.priorAssistantText) return current;
  return [
    `Solicitação anterior: ${oneLine(input.context.priorUserText, 4096)}`,
    `Resposta anterior do agente: ${oneLine(input.context.priorAssistantText, 500)}`,
    `Continuação do cliente: ${current}`,
  ].join("\n");
}
