import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationAlertSlaPanel } from "./PostActivationAlertSlaPanel";

const data = {
  items: [{
    alertKey: "23164020-8778-4226-afed-189e8d2333cc:milestone_overdue:adoption_d1",
    severity: "high" as const,
    lifecycle: "resolved" as const,
    openedAt: "2026-08-20T12:00:00.000Z",
    acknowledgedAt: "2026-08-20T13:00:00.000Z",
    resolvedAt: "2026-08-20T14:00:00.000Z",
    acknowledgementMinutes: 60,
    resolutionMinutes: 120,
    acknowledgementTargetMinutes: 120,
    resolutionTargetMinutes: 1440,
    acknowledgementBreached: false,
    resolutionBreached: false,
  }],
  summary: {
    total: 1,
    open: 0,
    acknowledged: 0,
    resolved: 1,
    acknowledgementBreached: 0,
    resolutionBreached: 0,
    withinSla: 1,
    complianceRate: 100,
  },
  invalidRecords: 0,
};

describe("PostActivationAlertSlaPanel", () => {
  it("renders healthy durable SLA metrics and occurrence details", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaPanel data={data} />);

    expect(html).toContain("SLA dos alertas operacionais");
    expect(html).toContain("Dentro da meta");
    expect(html).toContain("Conformidade");
    expect(html).toContain("100%");
    expect(html).toContain("1 de 1 dentro do SLA");
    expect(html).toContain("1 h / meta 2 h");
    expect(html).toContain("2 h / meta 24 h");
    expect(html).toContain("Resolvido");
    expect(html).toContain("Dados consistentes");
  });

  it("renders SLA filters and preserves the other page parameters", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaPanel
      data={data}
      filters={{ severity: "high", lifecycle: "resolved", breach: "any", limit: 25 }}
      preservedFilters={{ status: "overdue", historyAction: "resolved" }}
    />);

    expect(html).toContain("Filtrar SLA");
    expect(html).toContain('name="slaSeverity"');
    expect(html).toContain('value="high" selected=""');
    expect(html).toContain('name="slaLifecycle"');
    expect(html).toContain('value="resolved" selected=""');
    expect(html).toContain('name="slaBreach"');
    expect(html).toContain('value="any" selected=""');
    expect(html).toContain('name="slaLimit"');
    expect(html).toContain('value="25"');
    expect(html).toContain('type="hidden" name="status" value="overdue"');
    expect(html).toContain('type="hidden" name="historyAction" value="resolved"');
    expect(html).toContain("Exportar CSV");
    expect(html).toContain("sla-export?severity=high&amp;lifecycle=resolved&amp;breach=any&amp;limit=25");
  });

  it("highlights breached acknowledgement and resolution targets", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaPanel data={{
      ...data,
      items: [{
        ...data.items[0],
        severity: "critical",
        lifecycle: "acknowledged",
        resolvedAt: null,
        acknowledgementBreached: true,
        resolutionBreached: true,
      }],
      summary: {
        ...data.summary,
        open: 1,
        acknowledged: 1,
        resolved: 0,
        acknowledgementBreached: 1,
        resolutionBreached: 1,
        withinSla: 0,
        complianceRate: 0,
      },
    }} />);

    expect(html).toContain("Requer atenção");
    expect(html).toContain("Reconhecimento fora do SLA");
    expect(html).toContain("Resolução fora do SLA");
    expect(html).toContain("Meta excedida");
    expect(html).toContain("Crítico");
    expect(html).toContain("Reconhecido");
  });

  it("renders the empty durable state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaPanel data={{
      items: [],
      summary: {
        total: 0,
        open: 0,
        acknowledged: 0,
        resolved: 0,
        acknowledgementBreached: 0,
        resolutionBreached: 0,
        withinSla: 0,
        complianceRate: 100,
      },
      invalidRecords: 0,
    }} />);

    expect(html).toContain("Nenhuma ocorrência disponível para cálculo de SLA");
    expect(html).toContain("100%");
  });

  it("renders an isolated unavailable state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaPanel data={null} />);

    expect(html).toContain("Indicadores temporariamente indisponíveis");
    expect(html).not.toContain("Conformidade");
  });
});
