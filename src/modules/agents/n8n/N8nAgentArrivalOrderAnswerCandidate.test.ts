import { describe, expect, it } from "vitest";
import { createArrivalOrderAnswerCandidate } from "./N8nAgentArrivalOrderAnswerCandidate";

describe("n8n agent arrival order answer candidate", () => {
  it("returns only sanitized period capacity information", () => {
    const result = createArrivalOrderAnswerCandidate({ ok: true, attendanceDate: "2026-11-23", periods: [{ serviceName: "Consulta\nprivada", unitName: "Matriz", startTime: "08:00", endTime: "12:00", capacity: 30, registered: 28 }] });
    expect(result).toEqual({ kind: "arrival_order_availability", status: "ready", text: "Períodos por ordem de chegada em 23/11/2026:\n1. Consulta privada — Matriz — 08:00 às 12:00 — 2 vaga(s) restante(s)\nNenhum horário ou posição na fila foi reservado.", attendanceDate: "2026-11-23", periodCount: 1, source: "read_only_tool" });
  });
  it("omits exhausted and malformed periods", () => {
    expect(createArrivalOrderAnswerCandidate({ ok: true, attendanceDate: "2026-11-23", periods: [{ serviceName: "Consulta", unitName: "Matriz", startTime: "08:00", endTime: "12:00", capacity: 1, registered: 1 }] }).status).toBe("empty");
    expect(createArrivalOrderAnswerCandidate({ ok: false, attendanceDate: "2026-11-23" }).status).toBe("failed");
  });
});
