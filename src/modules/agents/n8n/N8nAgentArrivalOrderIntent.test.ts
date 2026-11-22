import { describe, expect, it } from "vitest";
import { parseN8nAgentArrivalOrderRequest } from "./N8nAgentArrivalOrderIntent";

describe("n8n agent arrival order intent", () => {
  it.each([
    ["Quero atendimento por ordem de chegada amanhã de manhã", { attendanceDate: "2026-11-23", dayPeriod: "morning" }],
    ["Posso comparecer dia 25/11 à tarde?", { attendanceDate: "2026-11-25", dayPeriod: "afternoon" }],
    ["Quero consulta sem horário marcado em 05/01", { attendanceDate: "2027-01-05", dayPeriod: null }],
  ])("recognizes a concrete arrival request: %s", (message, expected) => expect(parseN8nAgentArrivalOrderRequest(message, "2026-11-22")).toMatchObject(expected));

  it.each(["Quero marcar uma consulta às 09:00", "Quais são meus agendamentos?", "Quero remarcar por ordem de chegada amanhã", "Quero atendimento por ordem de chegada"])("does not steal unsupported or incomplete intent: %s", message => expect(parseN8nAgentArrivalOrderRequest(message, "2026-11-22")).toBeNull());
});
