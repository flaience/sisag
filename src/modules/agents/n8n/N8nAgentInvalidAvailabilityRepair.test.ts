import { describe, expect, it } from "vitest";
import { repairInvalidAvailabilityDecision } from "./N8nAgentInvalidAvailabilityRepair";

const serviceCatalog = [{ id: "11111111-1111-4111-8111-111111111111", name: "Consulta", durationMinutes: 30 }];
const base = { receivedAt: new Date("2026-10-15T21:34:00Z"), timeZone: "America/Sao_Paulo", serviceCatalog };

describe("n8n agent invalid availability repair", () => {
  it("repairs one exact service over the next seven local days", () => {
    expect(repairInvalidAvailabilityDecision({ ...base, message: "Há horários disponíveis para consulta nos próximos 7 dias?" })).toMatchObject({
      action: "request_read_only_tool",
      toolName: "scheduling.find_available_slots",
      toolArguments: { serviceId: serviceCatalog[0]!.id, durationMinutes: 30, dateFrom: "2026-10-15T03:00:00.000Z", dateTo: "2026-10-22T03:00:00.000Z", limit: 20 },
      reasonCode: "availability_required",
    });
  });

  it("supports today and tomorrow with trusted timezone boundaries", () => {
    expect(repairInvalidAvailabilityDecision({ ...base, message: "Tem horário para Consulta amanhã?" })?.toolArguments).toMatchObject({ dateFrom: "2026-10-16T03:00:00.000Z", dateTo: "2026-10-17T03:00:00.000Z" });
    expect(repairInvalidAvailabilityDecision({ ...base, message: "Tem horário para Consulta hoje?" })?.toolArguments).toMatchObject({ dateFrom: "2026-10-15T03:00:00.000Z", dateTo: "2026-10-16T03:00:00.000Z" });
  });

  it("refuses to guess service, period or unrelated intent", () => {
    expect(repairInvalidAvailabilityDecision({ ...base, message: "Há horários disponíveis nos próximos 7 dias?" })).toBeNull();
    expect(repairInvalidAvailabilityDecision({ ...base, message: "Há horários disponíveis para Consulta?" })).toBeNull();
    expect(repairInvalidAvailabilityDecision({ ...base, message: "Quero falar com atendente humano amanhã" })).toBeNull();
  });
});
