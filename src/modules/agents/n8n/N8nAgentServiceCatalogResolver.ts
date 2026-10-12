type ServiceCatalogEntry = { id: string; name: string; durationMinutes: number };
type SlotsDecision = {
  action?: string;
  toolName?: string | null;
  toolArguments?: Record<string, unknown> | null;
  [key: string]: unknown;
};

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function mentionedServices(message: string, catalog: ServiceCatalogEntry[]) {
  const normalizedMessage = " " + normalizeSearchText(message) + " ";
  return catalog.filter((service) => {
    const normalizedName = normalizeSearchText(service.name);
    return normalizedName.length > 0 && normalizedMessage.includes(" " + normalizedName + " ");
  });
}

export function groundServiceCatalogDecision<T extends SlotsDecision>(decision: T, message: string, catalog: ServiceCatalogEntry[]): T {
  if (decision.action !== "request_read_only_tool" || decision.toolName !== "scheduling.find_available_slots" || !decision.toolArguments) return decision;
  if (typeof decision.toolArguments.serviceId === "string") return decision;
  const matches = mentionedServices(message, catalog);
  if (matches.length !== 1) return decision;
  const service = matches[0]!;
  return { ...decision, toolArguments: { ...decision.toolArguments, serviceId: service.id, durationMinutes: service.durationMinutes } };
}
