import { describe, expect, it } from "vitest";
import { interpretMessage, parseSpokenDate } from "./interpretMessage";

const now = new Date("2026-09-25T15:00:00Z");
const timezone = "America/Sao_Paulo";

describe("Portuguese spoken date interpretation", () => {
  it.each([
    ["hoje", "2026-09-25"],
    ["amanhã", "2026-09-26"],
    ["segunda-feira", "2026-09-28"],
    ["na próxima terça às duas", "2026-09-29"],
    ["dia 30 às nove", "2026-09-30"],
  ])("parses %s as %s", (text, expected) => {
    expect(parseSpokenDate(text, now, timezone)).toBe(expected);
  });

  it.each([
    ["dia cinco às onze horas", "2026-10-05"],
    ["dia vinte e nove às dez", "2026-09-29"],
    ["dia trinta e um", "2026-10-31"],
  ])("parses spoken day %s as %s", (text, expected) => {
    expect(parseSpokenDate(text, now, timezone)).toBe(expected);
  });

  it("accepts the exact standalone production transcript during a pending conversation", () => {
    expect(
      interpretMessage(
        "Segunda-feira, dia cinco de outubro, às onze horas.",
        new Date("2026-09-28T13:00:00Z"),
        timezone,
      ),
    ).toMatchObject({
      intent: "SCHEDULE_REQUEST",
      slots: { dateIso: "2026-10-05", time: "11:00" },
    });
  });

  it("rolls an elapsed day of month into the next month", () => {
    expect(parseSpokenDate("dia 2", now, timezone)).toBe("2026-10-02");
  });

  it("rolls the same weekday into the following week", () => {
    expect(parseSpokenDate("sexta-feira", now, timezone)).toBe("2026-10-02");
  });

  it.each(["opção 2", "o segundo", "quero dois horários", "vinte profissionais"])("does not infer ambiguous date: %s", text => {
    expect(parseSpokenDate(text, now, timezone)).toBeUndefined();
  });

  it("combines a spoken weekday and spoken time", () => {
    expect(interpretMessage("Quero agendar segunda-feira às dez horas", now, timezone)).toMatchObject({
      intent: "SCHEDULE_REQUEST",
      slots: { dateIso: "2026-09-28", time: "10:00" },
    });
  });

  it("combines an explicit day and afternoon time", () => {
    expect(interpretMessage("Quero marcar dia 30 às três da tarde", now, timezone)).toMatchObject({
      intent: "SCHEDULE_REQUEST",
      slots: { dateIso: "2026-09-30", time: "15:00" },
    });
  });
});
