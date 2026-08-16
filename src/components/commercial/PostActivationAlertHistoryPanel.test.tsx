import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationAlertHistoryPanel } from "./PostActivationAlertHistoryPanel";

const data = {
  items: [{
    idempotencyKey: "platform-alert:request-1",
    alertKey: "onboarding:milestone_overdue:welcome",
    action: "acknowledged" as const,
    note: "Cliente contatado.",
    actor: { type: "human" as const, id: "operator-1" },
    actedAt: "2026-08-15T23:22:20.000Z",
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: "Clínica Exemplo",
  }, {
    idempotencyKey: "platform-alert:request-2",
    alertKey: "onboarding:milestone_overdue:welcome",
    action: "resolved" as const,
    actor: { type: "system" as const, id: "system-1" },
    actedAt: "2026-08-15T23:24:01.000Z",
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: "Clínica Exemplo",
  }],
  summary: { acknowledged: 1, resolved: 1, total: 2 },
  invalidRecords: 0,
};

describe("PostActivationAlertHistoryPanel", () => {
  it("renders alert action history", () => {
    const html = renderToStaticMarkup(<PostActivationAlertHistoryPanel
      data={data}
      filters={{}}
      preservedMonitoringFilters={{}}
    />);

    expect(html).toContain("Histórico dos alertas");
    expect(html).toContain("Clínica Exemplo");
    expect(html).toContain("Reconhecido");
    expect(html).toContain("Resolvido");
    expect(html).toContain("Operador");
    expect(html).toContain("Sistema");
    expect(html).toContain("Cliente contatado.");
    expect(html).toContain("1 reconhecido(s) · 1 resolvido(s)");
  });

  it("renders independent history filters and preserves monitoring filters", () => {
    const html = renderToStaticMarkup(<PostActivationAlertHistoryPanel
      data={data}
      filters={{ action: "resolved", actorType: "human", limit: 5 }}
      preservedMonitoringFilters={{ status: "overdue", limit: 20 }}
    />);

    expect(html).toContain('name="historyAction"');
    expect(html).toContain('value="resolved" selected=""');
    expect(html).toContain('name="historyActorType"');
    expect(html).toContain('value="human" selected=""');
    expect(html).toContain('name="historyLimit"');
    expect(html).toContain('value="5"');
    expect(html).toContain('type="hidden" name="status" value="overdue"');
    expect(html).toContain('type="hidden" name="limit" value="20"');
    expect(html).toContain("Exportar CSV");
    expect(html).toContain(
      'href="/platform/commercial/post-activation/export?action=resolved&amp;actorType=human&amp;limit=5"',
    );
  });

  it("renders the empty state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertHistoryPanel data={{
      items: [],
      summary: { acknowledged: 0, resolved: 0, total: 0 },
      invalidRecords: 0,
    }} filters={{}} preservedMonitoringFilters={{}} />);

    expect(html).toContain("Nenhuma ação registrada");
    expect(html).toContain("primeiro reconhecimento ou resolução");
  });

  it("renders an independent unavailable state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertHistoryPanel
      data={null}
      filters={{}}
      preservedMonitoringFilters={{}}
    />);

    expect(html).toContain("Histórico temporariamente indisponível");
    expect(html).toContain("alertas ativos e o monitoramento continuam disponíveis");
  });
});
