import fs from "node:fs";
import { describe, expect, it } from "vitest";

const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");
const lifecycle = fs.readFileSync("src/modules/bookings/WhatsAppBookingLifecycle.service.ts", "utf8");
const interpreter = fs.readFileSync("src/modules/assistant/whatsapp-core/interpreter/interpretMessage.ts", "utf8");
const agenda = fs.readFileSync("src/modules/agenda/Agenda.service.ts", "utf8");
const grid = fs.readFileSync("src/components/agenda/AgendaTimeColumn.tsx", "utf8");
const document = fs.readFileSync("docs/whatsapp-booking-lifecycle-production.md", "utf8");

describe("WhatsApp booking lifecycle production audit", () => {
  it("uses the official booking lifecycle for client management", () => {
    expect(assistant).toContain("WhatsAppBookingLifecycleService.listUpcoming");
    expect(assistant).toContain("WhatsAppBookingLifecycleService.reschedule");
    expect(assistant).toContain("WhatsAppBookingLifecycleService.cancel");
    expect(assistant).not.toContain("AppointmentService");
    expect(lifecycle).toContain("BookingService.rescheduleById");
    expect(lifecycle).toContain("BookingService.cancelById");
  });

  it("keeps lifecycle mutations tenant and client scoped", () => {
    expect(lifecycle).toContain("eq(bookings.companyId, input.companyId)");
    expect(lifecycle).toContain("eq(bookings.clientId, input.clientId)");
    expect(lifecycle).toContain('["PENDING", "CONFIRMED"]');
  });

  it("requires explicit confirmations and preserves production voice variants", () => {
    expect(assistant).toContain('textNorm === "YES"');
    expect(assistant).toContain('textNorm === "NO"');
    expect(assistant).toContain('mode: "CONFIRM"');
    expect(assistant).toContain('"si", "sin", "s"');
    expect(interpreter).toContain("SPOKEN_DAYS");
    expect(interpreter).toContain("normalized.matchAll(expression)");
  });

  it("renders official UTC bookings in the business-local agenda", () => {
    expect(agenda).toContain("formatTime(start.toISOString(), DEFAULT_TIMEZONE)");
    expect(grid).toContain("agendaTimeLabelToMinutes(item.timeLabel)");
    expect(grid).not.toContain("date.getHours()");
  });

  it("records evidence, guarantees and known limits", () => {
    for (const heading of ["## Evidências observadas", "## Garantias técnicas", "## Limites atuais e evolução planejada", "## Próximo marco recomendado"]) {
      expect(document).toContain(heading);
    }
    expect(document).not.toMatch(/sk-[A-Za-z0-9_-]+/);
    expect(document).not.toContain("META_ACCESS_TOKEN=");
  });
});
