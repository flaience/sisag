import { and, desc, eq, gte, ne, or } from "drizzle-orm";
import { messageLogs, n8nAgentShadowMirrorObservations } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { listCompanyServices } from "@/modules/services/ServiceCatalog.service";

type Input = { companyId: string; whatsappAccountId: string; senderPhoneE164: string; providerMessageId: string; text: string; receivedAt: Date };
type PriorMessage = { body: string; toPhone: string };
type Service = { name: string };
type Dependencies = {
  listServices?: (companyId: string) => Promise<Service[]>;
  findPriorClarification?: (input: Input, cutoff: Date) => Promise<PriorMessage[]>;
};

const WINDOW_MS = 15 * 60 * 1000;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

async function findPriorClarificationDb(input: Input, cutoff: Date): Promise<PriorMessage[]> {
  return getDb().select({ body: messageLogs.body, toPhone: messageLogs.toPhone })
    .from(messageLogs)
    .innerJoin(n8nAgentShadowMirrorObservations, and(
      eq(n8nAgentShadowMirrorObservations.companyId, messageLogs.companyId),
      eq(n8nAgentShadowMirrorObservations.correlationId, messageLogs.providerMessageId),
    ))
    .where(and(
      eq(messageLogs.companyId, input.companyId),
      eq(messageLogs.whatsappAccountId, input.whatsappAccountId),
      eq(messageLogs.channel, "whatsapp"),
      eq(messageLogs.provider, "meta"),
      eq(messageLogs.status, "received"),
      eq(messageLogs.messageType, "text"),
      ne(messageLogs.providerMessageId, input.providerMessageId),
      gte(messageLogs.createdAt, cutoff),
      or(
        and(
          eq(n8nAgentShadowMirrorObservations.decisionAction, "request_read_only_tool"),
          eq(n8nAgentShadowMirrorObservations.toolName, "scheduling.find_available_slots"),
          eq(n8nAgentShadowMirrorObservations.toolExecutionStatus, "failed"),
          eq(n8nAgentShadowMirrorObservations.toolErrorCode, "SCHEDULING_RESOURCE_NOT_FOUND"),
        ),
        and(
          eq(n8nAgentShadowMirrorObservations.decisionAction, "clarify"),
          eq(n8nAgentShadowMirrorObservations.reasonCode, "availability_required"),
          eq(n8nAgentShadowMirrorObservations.toolExecutionStatus, "skipped"),
        ),
      ),
    ))
    .orderBy(desc(messageLogs.createdAt))
    .limit(5);
}

export async function resolveN8nAgentConversationContext(input: Input, dependencies: Dependencies = {}) {
  const services = await (dependencies.listServices ?? (async companyId => (await listCompanyServices(companyId, "", "active")).map(({ name }) => ({ name }))))(input.companyId);
  const current = normalize(input.text);
  const matches = services.filter(service => normalize(service.name) === current);
  if (matches.length !== 1) return { text: input.text, continued: false as const };

  const cutoff = new Date(input.receivedAt.getTime() - WINDOW_MS);
  const candidates = await (dependencies.findPriorClarification ?? findPriorClarificationDb)(input, cutoff);
  const sender = normalizePhoneE164(input.senderPhoneE164);
  const prior = candidates.find(candidate => normalizePhoneE164(candidate.toPhone) === sender);
  if (!prior) return { text: input.text, continued: false as const };

  return { text: "Solicitação anterior: " + prior.body + "\nComplemento do cliente: " + input.text, continued: true as const };
}
