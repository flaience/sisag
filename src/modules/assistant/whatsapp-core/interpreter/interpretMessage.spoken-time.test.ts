import { describe, expect, it } from "vitest";
import { interpretMessage, parseSpokenTime } from "./interpretMessage";
describe("Portuguese spoken time interpretation", () => {
  it.each([["às dez horas","10:00"],["dez e meia","10:30"],["às nove e quinze","09:15"],["sete e quarenta e cinco","07:45"],["meio-dia","12:00"],["meia-noite","00:00"],["às oito da manhã","08:00"],["às três da tarde","15:00"],["às oito da noite","20:00"],["vinte e três horas","23:00"]])("parses %s as %s", (text, expected) => expect(parseSpokenTime(text)).toBe(expected));
  it("preserves the exact production transcript", () => expect(interpretMessage("Quero agendar amanhã às dez horas.", new Date("2026-09-25T15:00:00Z"), "America/Sao_Paulo")).toMatchObject({ intent:"SCHEDULE_REQUEST", slots:{ dateIso:"2026-09-26", time:"10:00" } }));
  it.each(["quero dois horários","opção dois","dia vinte e três","consulta com dois profissionais"])("does not infer ambiguous time: %s", text => expect(parseSpokenTime(text)).toBeUndefined());
  it("does not invent unsupported minutes", () => expect(parseSpokenTime("às dez e vinte")).toBeUndefined());
});
