import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationAlertPanel } from "./PostActivationAlertPanel";

const data = {
  alerts: [{
    key: "onboarding:human_escalation:welcome",
    severity: "critical" as const,
    category: "human_escalation" as const,
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: "Clínica Exemplo",
    planKey: "plan-1",
    milestoneCode: "welcome",
    milestoneTitle: "Boas-vindas",
    ownerType: "agent" as const,
    dueAt: "2026-08-15T12:00:00.000Z",
    reasons: ["open_critical_incidents"],
    supportWindowExpired: false,
  }],
  summary: { critical: 1, high: 0, total: 1 },
  invalidRecords: 0,
};

describe("PostActivationAlertPanel", () => {
  it("renders prioritized operational alerts", () => {
    const html = renderToStaticMarkup(<PostActivationAlertPanel data={data} />);
    expect(html).toContain("Alertas operacionais");
    expect(html).toContain("Clínica Exemplo");
    expect(html).toContain("Crítico");
    expect(html).toContain("Escalonamento humano");
    expect(html).toContain("Incidentes críticos abertos");
  });

  it("renders a healthy empty state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertPanel data={{
      alerts: [],
      summary: { critical: 0, high: 0, total: 0 },
      invalidRecords: 0,
    }} />);
    expect(html).toContain("Nenhum alerta operacional ativo");
  });

  it("keeps monitoring available when alerts cannot be loaded", () => {
    const html = renderToStaticMarkup(<PostActivationAlertPanel data={null} />);
    expect(html).toContain("Alertas temporariamente indisponíveis");
    expect(html).toContain("monitoramento permanece disponível");
  });
});
