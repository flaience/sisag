import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/bookings/[id]/journey/page.tsx", "utf8");
const header = fs.readFileSync("src/app/admin/bookings/[id]/journey/JourneyHeader.tsx", "utf8");

describe("booking journey essential view", () => {
  it("presents booking information and essential actions", () => {
    expect(page).toContain("Informações do agendamento");
    expect(page).toContain("Data e horário");
    expect(page).toContain("Profissional");
    expect(page).toContain("Protocolo");
    expect(page).toContain("Confirmar agendamento");
    expect(page).toContain("Cancelar agendamento");
  });

  it("does not render analytical and commercial journey cards", () => {
    expect(page).not.toContain("<JourneyPriorityBanner");
    expect(page).not.toContain("<JourneyQuickSignals");
    expect(page).not.toContain("<JourneyScorePanel");
    expect(page).not.toContain("<JourneyHealthPanel");
    expect(page).not.toContain("<JourneyOpportunitiesPanel");
    expect(page).not.toContain("<JourneyInsightsPanel");
    expect(page).not.toContain("<JourneySuggestedCommunicationsPanel");
  });

  it("uses Portuguese labels and returns to the agenda", () => {
    expect(header).toContain('PENDING: "Pendente"');
    expect(header).toContain('router.push("/admin/agenda")');
    expect(header).toContain("Voltar para a agenda");
    expect(header).toContain("Detalhes do agendamento");
    expect(header).not.toContain("{data.booking.status}");
  });
});
