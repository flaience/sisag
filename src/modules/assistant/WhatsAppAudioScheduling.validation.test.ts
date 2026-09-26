import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { interpretMessage } from "./whatsapp-core/interpreter/interpretMessage";

describe("WhatsApp audio scheduling validation", () => {
  const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");
  const dispatch = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts", "utf8");
  const processing = fs.readFileSync("src/modules/assistant/audio/WhatsAppAudioProcessing.service.ts", "utf8");

  it("interprets a natural spoken scheduling request from an explicit reference instant", () => {
    const result = interpretMessage("Quero agendar amanhã às 10 horas", new Date("2026-09-25T15:00:00Z"), "America/Sao_Paulo");
    expect(result).toMatchObject({ intent: "SCHEDULE_REQUEST", slots: { dateIso: "2026-09-26", time: "10:00" } });
  });

  it("preserves missing information instead of inventing a time", () => {
    const result = interpretMessage("Quero marcar uma consulta amanhã", new Date("2026-09-25T15:00:00Z"), "America/Sao_Paulo");
    expect(result).toMatchObject({ intent: "SCHEDULE_REQUEST", slots: { dateIso: "2026-09-26" } });
    expect(result.slots.time).toBeUndefined();
  });

  it("delivers only the persisted transcript under the original message identity", () => {
    for (const value of ["claimed.transcript", "correlationId: claimed.providerMessageId", "claimed.companyId", "findPhone"]) expect(dispatch).toContain(value);
    expect(dispatch).not.toContain("executeBookingCommand");
  });

  it("keeps transcription isolated from assistant and booking execution", () => {
    expect(processing).not.toContain("AssistantWhatsAppService");
    expect(processing).not.toContain("executeBookingCommand");
  });

  it("requires an explicit affirmative turn before the official booking command", () => {
    const confirmation = assistant.slice(assistant.indexOf("if (sessionCtx.pendingBookingDraft)"));
    expect(confirmation).toContain('textNorm !== "YES"');
    expect(confirmation.indexOf('textNorm !== "YES"')).toBeLessThan(confirmation.indexOf("await executeBookingCommand("));
    expect(confirmation).toContain('source: "whatsapp"');
    expect(confirmation).toContain("pendingBookingDraft");
  });

  it("supports a negative confirmation without executing a booking", () => {
    const confirmation = assistant.slice(assistant.indexOf("if (sessionCtx.pendingBookingDraft)"));
    expect(confirmation).toContain('textNorm === "NO"');
    expect(confirmation).toContain("não confirmei o agendamento");
  });

  it("uses real availability and never creates an appointment directly", () => {
    expect(assistant).toContain("listServiceLedAvailability");
    expect(assistant).toContain("executeBookingCommand");
    expect(assistant).not.toContain("AppointmentService.create");
  });
});
