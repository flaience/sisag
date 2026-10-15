const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

export function isN8nAgentAvailabilityIntent(text: string) {
  const normalized = normalize(text);
  return /(?:^|\s)(?:horario|horarios|agenda|disponibilidade|disponivel|disponiveis)(?:$|\s)/.test(normalized);
}
