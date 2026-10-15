import { addDaysIso, todayDateIso, zonedDateTimeToUtcISOString } from "@/lib/time";
import { N8nAgentShadowDecisionSchema, type N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { groundServiceCatalogDecision } from "./N8nAgentServiceCatalogResolver";
import { isN8nAgentAvailabilityIntent } from "./N8nAgentAvailabilityIntent";

type Service = { id: string; name: string; durationMinutes: number };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

function availabilityRange(text: string, receivedAt: Date, timeZone: string) {
  const normalized = normalize(text);
  const today = todayDateIso(timeZone, receivedAt);
  const nextDays = normalized.match(/proximos?\s+(\d{1,2})\s+dias?/);
  let startDay = today;
  let endDay: string;
  if (nextDays) {
    const days = Number(nextDays[1]);
    if (!Number.isInteger(days) || days < 1 || days > 31) return null;
    endDay = addDaysIso(today, days);
  } else if (/(?:^|\s)amanha(?:$|\s|[.,!?])/.test(normalized)) {
    startDay = addDaysIso(today, 1);
    endDay = addDaysIso(today, 2);
  } else if (/(?:^|\s)hoje(?:$|\s|[.,!?])/.test(normalized)) {
    endDay = addDaysIso(today, 1);
  } else {
    return null;
  }
  return {
    dateFrom: zonedDateTimeToUtcISOString(startDay, "00:00", timeZone),
    dateTo: zonedDateTimeToUtcISOString(endDay, "00:00", timeZone),
  };
}

export function repairInvalidAvailabilityDecision(input: { message: string; receivedAt: Date; timeZone: string; serviceCatalog: Service[] }): N8nAgentShadowDecision | null {
  if (!isN8nAgentAvailabilityIntent(input.message)) return null;
  const range = availabilityRange(input.message, input.receivedAt, input.timeZone);
  if (!range) return null;
  const draft = {
    action: "request_read_only_tool",
    toolName: "scheduling.find_available_slots",
    toolArguments: { professionalId: null, unitId: null, serviceId: null, resourceId: null, ...range, durationMinutes: null, limit: 20, stepMinutes: null },
    answerDraft: null,
    clarificationQuestion: null,
    confidence: 1,
    reasonCode: "availability_required",
  };
  const grounded = groundServiceCatalogDecision(draft, input.message, input.serviceCatalog);
  if (typeof grounded.toolArguments?.serviceId !== "string") return null;
  const parsed = N8nAgentShadowDecisionSchema.safeParse(grounded);
  return parsed.success ? parsed.data : null;
}
