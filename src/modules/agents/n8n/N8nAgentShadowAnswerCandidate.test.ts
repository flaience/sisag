import { describe, expect, it } from "vitest";
import { createAvailabilityAnswerCandidate } from "./N8nAgentShadowAnswerCandidate";
describe("n8n agent shadow answer candidate", () => {
  it("creates a concise localized availability answer", () => expect(createAvailabilityAnswerCandidate({ ok: true, timeZone: "America/Sao_Paulo", slots: [{ startsAt: "2026-10-12T12:00:00Z" }, { startsAt: "2026-10-12T13:00:00Z" }] })).toEqual({ kind: "availability", status: "ready", text: "Sim. Encontrei horários disponíveis: segunda-feira, 12/10: 09:00 e 10:00.", slotCount: 2, source: "read_only_tool" }));
  it("answers explicitly when no slots exist", () => expect(createAvailabilityAnswerCandidate({ ok: true, timeZone: "America/Sao_Paulo", slots: [] }).status).toBe("empty"));
  it("asks for missing scheduling context without repeating the date question", () => expect(createAvailabilityAnswerCandidate({ ok: false, errorCode: "SCHEDULING_RESOURCE_NOT_FOUND", timeZone: "America/Sao_Paulo" })).toMatchObject({ status: "clarify", text: "Para qual serviço ou profissional você deseja consultar os horários?" }));
  it("fails closed without inventing availability", () => expect(createAvailabilityAnswerCandidate({ ok: false, timeZone: "America/Sao_Paulo" })).toMatchObject({ status: "failed", slotCount: 0 }));
});
