import { describe, expect, it } from "vitest";
import { groundServiceCatalogDecision } from "./N8nAgentServiceCatalogResolver";

const catalog = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Consulta", durationMinutes: 30 },
  { id: "22222222-2222-4222-8222-222222222222", name: "Avaliação Clínica", durationMinutes: 45 },
];
const decision = { action: "request_read_only_tool", toolName: "scheduling.find_available_slots", toolArguments: { serviceId: null, durationMinutes: null, dateFrom: "2026-10-13T00:00:00-03:00", dateTo: "2026-10-14T00:00:00-03:00", limit: 10 } };

describe("deterministic service catalog resolution", () => {
  it("grounds a service mentioned with different case", () => {
    expect(groundServiceCatalogDecision(decision, "Há horários para consulta amanhã?", catalog).toolArguments).toMatchObject({ serviceId: catalog[0]!.id, durationMinutes: 30 });
  });

  it("matches composed names without accent sensitivity", () => {
    expect(groundServiceCatalogDecision(decision, "Quero uma avaliacao clinica amanhã", catalog).toolArguments).toMatchObject({ serviceId: catalog[1]!.id, durationMinutes: 45 });
  });

  it("does not guess when no unique service is mentioned", () => {
    expect(groundServiceCatalogDecision(decision, "Há horários amanhã?", catalog)).toEqual(decision);
    const ambiguous = [...catalog, { id: "33333333-3333-4333-8333-333333333333", name: "Consulta", durationMinutes: 60 }];
    expect(groundServiceCatalogDecision(decision, "Há horários para consulta?", ambiguous)).toEqual(decision);
  });

  it("preserves a service already selected by the provider", () => {
    const selected = { ...decision, toolArguments: { ...decision.toolArguments, serviceId: catalog[1]!.id, durationMinutes: 45 } };
    expect(groundServiceCatalogDecision(selected, "consulta", catalog)).toEqual(selected);
  });
});
