import { and, desc, eq, gte, inArray, ne, or } from "drizzle-orm";
import { messageLogs, n8nAgentShadowMirrorObservations } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { listCompanyServices } from "@/modules/services/ServiceCatalog.service";
import { isExplicitN8nAgentBookingSlotSelection } from "./N8nAgentBookingSlotSelection";
import { isN8nAgentAvailabilityIntent } from "./N8nAgentAvailabilityIntent";

type Input = { companyId: string; whatsappAccountId: string; senderPhoneE164: string; providerMessageId: string; text: string; receivedAt: Date };
type PriorMessage = { body: string; toPhone: string };
type Service = { name: string };
type Dependencies = {
  listServices?: (companyId: string) => Promise<Service[]>;
  findPriorClarification?: (input: Input, cutoff: Date) => Promise<PriorMessage[]>;
  findPriorAvailability?: (input: Input, cutoff: Date) => Promise<PriorMessage[]>;
  findPriorSelectedAction?: (input: Input, cutoff: Date) => Promise<PriorMessage[]>;
};

const WINDOW_MS = 15 * 60 * 1000;
const SELECTED_ACTION_WINDOW_MS = 60 * 60 * 1000;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const isTrustedContinuationSource = (value: string) => /\b(horario|horarios|disponib|remarc|remarqu|reagend|agendamento|agendamentos|agendar|marcar|reserv)\w*/.test(normalize(value));

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

async function findPriorAvailabilityDb(input: Input, cutoff: Date): Promise<PriorMessage[]> {
  return getDb().select({ body: messageLogs.body, toPhone: messageLogs.toPhone })
    .from(messageLogs)
    .innerJoin(n8nAgentShadowMirrorObservations, and(eq(n8nAgentShadowMirrorObservations.companyId, messageLogs.companyId), eq(n8nAgentShadowMirrorObservations.correlationId, messageLogs.providerMessageId)))
    .where(and(eq(messageLogs.companyId, input.companyId), eq(messageLogs.whatsappAccountId, input.whatsappAccountId), eq(messageLogs.channel, "whatsapp"), eq(messageLogs.provider, "meta"), eq(messageLogs.status, "received"), eq(messageLogs.messageType, "text"), ne(messageLogs.providerMessageId, input.providerMessageId), gte(messageLogs.createdAt, cutoff), or(and(eq(n8nAgentShadowMirrorObservations.decisionAction, "request_read_only_tool"), inArray(n8nAgentShadowMirrorObservations.toolName, ["scheduling.find_available_slots", "scheduling.prepare_rescheduling", "scheduling.list_upcoming_appointments", "scheduling.resolve_selected_appointment_action"]), eq(n8nAgentShadowMirrorObservations.toolExecutionStatus, "succeeded")), and(eq(n8nAgentShadowMirrorObservations.decisionAction, "clarify"), inArray(n8nAgentShadowMirrorObservations.reasonCode, ["rescheduling_required", "missing_information"]), eq(n8nAgentShadowMirrorObservations.toolExecutionStatus, "skipped")))))
    .orderBy(desc(messageLogs.createdAt)).limit(5);
}

async function findPriorSelectedActionDb(input: Input, cutoff: Date): Promise<PriorMessage[]> {
  return getDb().select({ body: messageLogs.body, toPhone: messageLogs.toPhone })
    .from(messageLogs)
    .innerJoin(n8nAgentShadowMirrorObservations, and(eq(n8nAgentShadowMirrorObservations.companyId, messageLogs.companyId), eq(n8nAgentShadowMirrorObservations.correlationId, messageLogs.providerMessageId)))
    .where(and(eq(messageLogs.companyId, input.companyId), eq(messageLogs.whatsappAccountId, input.whatsappAccountId), eq(messageLogs.channel, "whatsapp"), eq(messageLogs.provider, "meta"), eq(messageLogs.status, "received"), eq(messageLogs.messageType, "text"), ne(messageLogs.providerMessageId, input.providerMessageId), gte(messageLogs.createdAt, cutoff), eq(n8nAgentShadowMirrorObservations.decisionAction, "request_read_only_tool"), eq(n8nAgentShadowMirrorObservations.toolName, "scheduling.resolve_selected_appointment_action"), eq(n8nAgentShadowMirrorObservations.toolExecutionStatus, "succeeded")))
    .orderBy(desc(messageLogs.createdAt)).limit(1);
}

export const isN8nAgentBookingSlotContextEnabled = () => process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED === "true";

export async function resolveN8nAgentConversationContext(input: Input, dependencies: Dependencies = {}) {
  const services = await (dependencies.listServices ?? (async companyId => (await listCompanyServices(companyId, "", "active")).map(({ name }) => ({ name }))))(input.companyId);
  const current = normalize(input.text);
  const matches = services.filter(service => normalize(service.name) === current);
  const cutoff = new Date(input.receivedAt.getTime() - WINDOW_MS);

  if (matches.length !== 1) {
    const slotSelection = isExplicitN8nAgentBookingSlotSelection(input.text);
    const availabilityFollowUp = isN8nAgentAvailabilityIntent(input.text);
    if (!isN8nAgentBookingSlotContextEnabled() || (!slotSelection && !availabilityFollowUp)) return { text: input.text, continued: false as const };
    const candidates = await (dependencies.findPriorAvailability ?? findPriorAvailabilityDb)(input, cutoff);
    const sender = normalizePhoneE164(input.senderPhoneE164);
    let prior = candidates.find(candidate => normalizePhoneE164(candidate.toPhone) === sender && isTrustedContinuationSource(candidate.body));
    if (!prior && slotSelection) {
      const selectedActionCutoff = new Date(input.receivedAt.getTime() - SELECTED_ACTION_WINDOW_MS);
      const selectedActions = await (dependencies.findPriorSelectedAction ?? findPriorSelectedActionDb)(input, selectedActionCutoff);
      prior = selectedActions.find(candidate => normalizePhoneE164(candidate.toPhone) === sender && isTrustedContinuationSource(candidate.body));
    }
    if (!prior) return { text: input.text, continued: false as const };
    const label = slotSelection ? "Escolha de horário do cliente: " : "Nova consulta de disponibilidade do cliente: ";
    return { text: "Solicitação anterior: " + prior.body + "\n" + label + input.text, continued: true as const };
  }
  const candidates = await (dependencies.findPriorClarification ?? findPriorClarificationDb)(input, cutoff);
  const sender = normalizePhoneE164(input.senderPhoneE164);
  const prior = candidates.find(candidate => normalizePhoneE164(candidate.toPhone) === sender);
  if (!prior) return { text: input.text, continued: false as const };

  return { text: "Solicitação anterior: " + prior.body + "\nComplemento do cliente: " + input.text, continued: true as const };
}
