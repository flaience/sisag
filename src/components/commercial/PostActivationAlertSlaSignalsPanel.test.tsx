import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostActivationAlertSlaSignalsPanel } from "./PostActivationAlertSlaSignalsPanel";

const data = {
  signals: [{
    key: "alert-1:sla_resolution_breached",
    alertKey: "alert-1",
    type: "resolution_breached" as const,
    severity: "critical" as const,
    priority: "critical" as const,
    elapsedMinutes: 300,
    targetMinutes: 240,
    overdueMinutes: 60,
  }],
  summary: {
    total: 1,
    critical: 1,
    acknowledgementBreached: 0,
    resolutionBreached: 1,
  },
  sourceInvalidRecords: 0,
};

describe("PostActivationAlertSlaSignalsPanel", () => {
  it("renders prioritized actionable SLA signals", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaSignalsPanel data={data} />);
    expect(html).toContain("Sinais acionáveis de SLA");
    expect(html).toContain("Requer atenção");
    expect(html).toContain("Críticos");
    expect(html).toContain("Resolução fora do SLA");
    expect(html).toContain("300 min · meta 240 min");
    expect(html).toContain("60 min acima da meta");
    expect(html).toContain("Dados consistentes");
  });

  it("renders signal filters and preserves other page parameters", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaSignalsPanel
      data={data}
      filters={{ severity: "critical", type: "resolution_breached", limit: 10 }}
      preservedFilters={{ status: "overdue", slaSeverity: "high", historyAction: "resolved" }}
    />);
    expect(html).toContain("Filtrar sinais");
    expect(html).toContain('name="slaSignalSeverity"');
    expect(html).toContain('value="critical" selected=""');
    expect(html).toContain('name="slaSignalType"');
    expect(html).toContain('value="resolution_breached" selected=""');
    expect(html).toContain('name="slaSignalLimit"');
    expect(html).toContain('value="10"');
    expect(html).toContain('type="hidden" name="status" value="overdue"');
    expect(html).toContain('type="hidden" name="slaSeverity" value="high"');
    expect(html).toContain('type="hidden" name="historyAction" value="resolved"');
  });

  it("renders the stable empty state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaSignalsPanel data={{
      signals: [],
      summary: { total: 0, critical: 0, acknowledgementBreached: 0, resolutionBreached: 0 },
      sourceInvalidRecords: 0,
    }} />);
    expect(html).toContain("Operação estável");
    expect(html).toContain("Nenhum sinal acionável de SLA no momento");
  });

  it("shows invalid source records without hiding valid signals", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaSignalsPanel data={{
      ...data,
      sourceInvalidRecords: 2,
    }} />);
    expect(html).toContain("2 registro(s) inválido(s) na origem");
    expect(html).toContain("Resolução fora do SLA");
  });

  it("renders an isolated unavailable state", () => {
    const html = renderToStaticMarkup(<PostActivationAlertSlaSignalsPanel data={null} />);
    expect(html).toContain("Sinais temporariamente indisponíveis");
    expect(html).not.toContain("Sinais ativos");
  });
});
