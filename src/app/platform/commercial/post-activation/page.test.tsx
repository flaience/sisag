import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  alerts: vi.fn(),
  history: vi.fn(),
  runnerMetrics: vi.fn(),
  dueWork: vi.fn(),
  dueDeferrals: vi.fn(),
  sla: vi.fn(),
  slaSignals: vi.fn(),
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-history.service", () => ({
  listCommercialPostActivationAlertHistory: mocks.history,
}));
vi.mock("@/modules/commercial/commercial-post-activation-monitoring-query.service", () => ({
  listCommercialPostActivationMonitoring: mocks.query,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-query.service", () => ({
  listCommercialPostActivationAlerts: mocks.alerts,
}));
vi.mock("@/modules/commercial/commercial-post-activation-runner-metrics-query.service", () => ({
  getCommercialPostActivationRunnerMetrics: mocks.runnerMetrics,
}));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-query.service", () => ({
  getCommercialPostActivationDueWorkSnapshot: mocks.dueWork,
}));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-deferral-query.service", () => ({
  listCommercialPostActivationDueWorkDeferrals: mocks.dueDeferrals,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-sla-query.service", () => ({
  listCommercialPostActivationAlertSla: mocks.sla,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-sla-signal-query.service", () => ({
  listCommercialPostActivationAlertSlaSignals: mocks.slaSignals,
}));
vi.mock("@/components/commercial/PostActivationRunnerHealthPanel", () => ({
  PostActivationRunnerHealthPanel: ({ data }: { data: unknown }) => <div>runner-metrics:{data ? "available" : "unavailable"}</div>,
}));
vi.mock("@/components/commercial/PostActivationDueWorkPanel", () => ({
  PostActivationDueWorkPanel: ({ data }: { data: unknown }) => <div>due-work:{data ? "available" : "unavailable"}</div>,
}));
vi.mock("@/components/commercial/PostActivationDueWorkDeferralPanel", () => ({
  PostActivationDueWorkDeferralPanel: ({ data, filters }: {
    data: unknown;
    filters: Record<string, unknown>;
  }) => <div>due-deferrals:{data ? "available" : "unavailable"};filters:{JSON.stringify(filters)}</div>,
}));
vi.mock("@/components/commercial/PostActivationAlertSlaPanel", () => ({
  PostActivationAlertSlaPanel: ({ data, filters }: {
    data: unknown;
    filters: Record<string, unknown>;
  }) => <div>alert-sla:{data ? "available" : "unavailable"};filters:{JSON.stringify(filters)}</div>,
}));
vi.mock("@/components/commercial/PostActivationAlertSlaSignalsPanel", () => ({
  PostActivationAlertSlaSignalsPanel: ({ data, filters }: {
    data: unknown;
    filters: Record<string, unknown>;
  }) => <div>sla-signals:{data ? "available" : "unavailable"};filters:{JSON.stringify(filters)}</div>,
}));
vi.mock("@/components/commercial/PostActivationMonitoringDashboard", () => ({
  PostActivationMonitoringDashboard: ({ data }: { data: { items: unknown[] } }) => (
    <div>dashboard-items:{data.items.length}</div>
  ),
}));
vi.mock("@/components/commercial/PostActivationAlertPanel", () => ({
  PostActivationAlertPanel: ({ data }: { data: { alerts: unknown[] } | null }) => (
    <div>alert-items:{data?.alerts.length ?? "unavailable"}</div>
  ),
}));
vi.mock("@/components/commercial/PostActivationAlertHistoryPanel", () => ({
  PostActivationAlertHistoryPanel: ({ data, filters, preservedMonitoringFilters }: {
    data: { items: unknown[] } | null;
    filters: Record<string, unknown>;
    preservedMonitoringFilters: Record<string, unknown>;
  }) => (
    <div>history-items:{data?.items.length ?? "unavailable"};filters:{JSON.stringify(filters)};monitoring:{JSON.stringify(preservedMonitoringFilters)}</div>
  ),
}));

import PlatformPostActivationPage from "./page";

const data = {
  items: [{ onboardingId: "23164020-8778-4226-afed-189e8d2333cc" }],
  summary: { scheduled: 0, waiting: 0, overdue: 1, escalated: 0, completed: 0 },
  invalidRecords: 0,
  failures: [],
};
const alertData = {
  alerts: [{ key: "onboarding:milestone_overdue:welcome" }],
  summary: { critical: 0, high: 1, total: 1 },
  invalidRecords: 0,
};
const historyData = {
  items: [{ idempotencyKey: "request-1", action: "resolved" }],
  summary: { acknowledged: 0, resolved: 1, total: 1 },
  invalidRecords: 0,
  nextCursor: "next-page-cursor",
};

async function render(searchParams: Record<string, string | string[] | undefined> = {}) {
  const component = await PlatformPostActivationPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(component);
}

describe("PlatformPostActivationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ ok: true, data });
    mocks.alerts.mockResolvedValue({ ok: true, data: alertData });
    mocks.history.mockResolvedValue({ ok: true, data: historyData });
    mocks.runnerMetrics.mockResolvedValue({ ok: true, data: { executionKey: "344" } });
    mocks.dueWork.mockResolvedValue({ ok: true, data: { status: "healthy", total: 5 } });
    mocks.dueDeferrals.mockResolvedValue({ ok: true, data: { status: "degraded", total: 1, items: [] } });
    mocks.sla.mockResolvedValue({ ok: true, data: { items: [], summary: {}, invalidRecords: 0 } });
    mocks.slaSignals.mockResolvedValue({ ok: true, data: { signals: [], summary: {}, sourceInvalidRecords: 0 } });
  });

  it("loads and renders runner health, SLA, monitoring, active alerts and history", async () => {
    const html = await render();
    expect(html).toContain("Acompanhamento pós-ativação");
    expect(html).toContain("runner-metrics:available");
    expect(html).toContain("due-work:available");
    expect(html).toContain("due-deferrals:available");
    expect(html).toContain("alert-sla:available");
    expect(html).toContain("sla-signals:available");
    expect(html).toContain('filters:{}');
    expect(html).toContain("dashboard-items:1");
    expect(html).toContain("alert-items:1");
    expect(html).toContain("history-items:1");
    expect(mocks.runnerMetrics).toHaveBeenCalledWith();
    expect(mocks.dueWork).toHaveBeenCalledWith();
    expect(mocks.dueDeferrals).toHaveBeenCalledWith({
      state: undefined,
      limit: undefined,
      offset: undefined,
    });
    expect(mocks.sla).toHaveBeenCalledWith({
      severity: undefined,
      lifecycle: undefined,
      breach: undefined,
      limit: undefined,
      offset: undefined,
    });
    expect(mocks.slaSignals).toHaveBeenCalledWith({
      severity: undefined,
      type: undefined,
      limit: undefined,
    });
    expect(mocks.query).toHaveBeenCalledWith({ status: undefined, limit: undefined });
    expect(mocks.alerts).toHaveBeenCalledWith({ limit: 10 });
    expect(mocks.history).toHaveBeenCalledWith({
      action: undefined,
      actorType: undefined,
      limit: undefined,
      cursor: undefined,
    });
  });

  it("forwards URL filters to the server monitoring query", async () => {
    const html = await render({ status: "escalated", limit: "10" });
    expect(html).toContain("Escalonados");
    expect(mocks.query).toHaveBeenCalledWith({ status: "escalated", limit: 10 });
  });

  it("forwards due-work deferral filters independently", async () => {
    const html = await render({
      dueDeferralState: "escalated",
      dueDeferralLimit: "10",
      dueDeferralOffset: "20",
    });
    expect(mocks.dueDeferrals).toHaveBeenCalledWith({
      state: "escalated",
      limit: 10,
      offset: 20,
    });
    expect(html).toContain('name="dueDeferralState" value="escalated"');
    expect(html).toContain('name="dueDeferralLimit" value="10"');
    expect(html).toContain('name="dueDeferralOffset" value="20"');
  });

  it("uses the first value for repeated query parameters", async () => {
    await render({ status: ["overdue", "completed"], limit: ["5", "100"] });
    expect(mocks.query).toHaveBeenCalledWith({ status: "overdue", limit: 5 });
  });

  it("forwards SLA filters and preserves them in the monitoring form", async () => {
    const html = await render({
      slaSeverity: "critical",
      slaLifecycle: "resolved",
      slaBreach: "any",
      slaLimit: "25",
      slaOffset: "50",
    });
    expect(mocks.sla).toHaveBeenCalledWith({
      severity: "critical",
      lifecycle: "resolved",
      breach: "any",
      limit: 25,
      offset: 50,
    });
    expect(html).toContain('name="slaSeverity" value="critical"');
    expect(html).toContain('name="slaLifecycle" value="resolved"');
    expect(html).toContain('name="slaBreach" value="any"');
    expect(html).toContain('name="slaLimit" value="25"');
    expect(html).toContain('name="slaOffset" value="50"');
  });

  it("forwards SLA signal filters and preserves them in the monitoring form", async () => {
    const html = await render({
      slaSignalSeverity: "critical",
      slaSignalType: "resolution_breached",
      slaSignalLimit: "10",
    });
    expect(mocks.slaSignals).toHaveBeenCalledWith({
      severity: "critical",
      type: "resolution_breached",
      limit: 10,
    });
    expect(html).toContain('name="slaSignalSeverity" value="critical"');
    expect(html).toContain('name="slaSignalType" value="resolution_breached"');
    expect(html).toContain('name="slaSignalLimit" value="10"');
    expect(html).toContain('filters:{&quot;severity&quot;:&quot;critical&quot;,&quot;type&quot;:&quot;resolution_breached&quot;,&quot;limit&quot;:10}');
  });

  it("forwards history filters and preserves monitoring filters", async () => {
    const html = await render({
      status: "overdue",
      limit: "20",
      historyAction: "resolved",
      historyActorType: "human",
      historyLimit: "5",
      historyCursor: "current-page-cursor",
    });

    expect(mocks.history).toHaveBeenCalledWith({
      action: "resolved",
      actorType: "human",
      limit: 5,
      cursor: "current-page-cursor",
    });
    expect(html).toContain('filters:{&quot;action&quot;:&quot;resolved&quot;,&quot;actorType&quot;:&quot;human&quot;,&quot;limit&quot;:5,&quot;cursor&quot;:&quot;current-page-cursor&quot;}');
    expect(html).toContain('monitoring:{&quot;status&quot;:&quot;overdue&quot;,&quot;limit&quot;:20}');
    expect(html).toContain('type="hidden" name="historyAction" value="resolved"');
    expect(html).toContain('type="hidden" name="historyActorType" value="human"');
    expect(html).toContain('type="hidden" name="historyLimit" value="5"');
    expect(html).toContain('type="hidden" name="historyCursor" value="current-page-cursor"');
  });

  it("uses the first repeated history filter value", async () => {
    await render({ historyAction: ["acknowledged", "resolved"], historyLimit: ["5", "100"] });
    expect(mocks.history).toHaveBeenCalledWith({
      action: "acknowledged",
      actorType: undefined,
      limit: 5,
      cursor: undefined,
    });
  });

  it("keeps monitoring visible when alert query returns a controlled failure", async () => {
    mocks.alerts.mockResolvedValue({
      ok: false,
      error: "monitoring_unavailable",
      message: "private alert detail",
    });
    const html = await render();
    expect(html).toContain("dashboard-items:1");
    expect(html).toContain("alert-items:unavailable");
    expect(html).not.toContain("private alert detail");
  });

  it("keeps monitoring visible when alert query throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.alerts.mockRejectedValue(new Error("private alert database detail"));
    const html = await render();
    expect(html).toContain("dashboard-items:1");
    expect(html).toContain("alert-items:unavailable");
    expect(html).not.toContain("private alert database detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the page visible when history returns a controlled failure", async () => {
    mocks.history.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "private history detail",
    });
    const html = await render();
    expect(html).toContain("dashboard-items:1");
    expect(html).toContain("alert-items:1");
    expect(html).toContain("history-items:unavailable");
    expect(html).not.toContain("private history detail");
  });

  it("keeps the page visible when history query throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.history.mockRejectedValue(new Error("private history database detail"));
    const html = await render();
    expect(html).toContain("dashboard-items:1");
    expect(html).toContain("alert-items:1");
    expect(html).toContain("history-items:unavailable");
    expect(html).not.toContain("private history database detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the page visible when runner metrics return a controlled failure", async () => {
    mocks.runnerMetrics.mockResolvedValue({
      ok: false,
      error: "invalid_stored_run",
      message: "private runner metrics detail",
    });

    const html = await render();
    expect(html).toContain("runner-metrics:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private runner metrics detail");
  });

  it("keeps the page visible when the runner metrics query throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.runnerMetrics.mockRejectedValue(new Error("private runner metrics database detail"));

    const html = await render();
    expect(html).toContain("runner-metrics:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private runner metrics database detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the page visible when due-work indicators return a controlled failure", async () => {
    mocks.dueWork.mockResolvedValue({
      ok: false,
      error: "invalid_snapshot",
      message: "private due-work detail",
    });

    const html = await render();
    expect(html).toContain("due-work:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private due-work detail");
  });

  it("keeps the page visible when the due-work query throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.dueWork.mockRejectedValue(new Error("private due-work database detail"));

    const html = await render();
    expect(html).toContain("due-work:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private due-work database detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the page visible when SLA returns a controlled failure", async () => {
    mocks.sla.mockResolvedValue({
      ok: false,
      error: "invalid_sla_data",
      message: "private SLA detail",
    });

    const html = await render();

    expect(html).toContain("alert-sla:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private SLA detail");
  });

  it("keeps the page visible when the SLA query throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sla.mockRejectedValue(new Error("private SLA database detail"));

    const html = await render();

    expect(html).toContain("alert-sla:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private SLA database detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the page visible when SLA signals return a controlled failure", async () => {
    mocks.slaSignals.mockResolvedValue({
      ok: false,
      error: "invalid_signal_data",
      message: "private signal detail",
    });
    const html = await render();
    expect(html).toContain("sla-signals:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private signal detail");
  });

  it("keeps the page visible when the SLA signal query throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.slaSignals.mockRejectedValue(new Error("private signal database detail"));
    const html = await render();
    expect(html).toContain("sla-signals:unavailable");
    expect(html).toContain("dashboard-items:1");
    expect(html).not.toContain("private signal database detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("renders controlled monitoring validation errors without querying alerts", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Filtro de monitoramento inválido.",
    });
    const html = await render({ limit: "invalid" });
    expect(html).toContain("Monitoramento indisponível");
    expect(html).toContain("Filtro de monitoramento inválido.");
    expect(html).not.toContain("dashboard-items");
    expect(mocks.alerts).not.toHaveBeenCalled();
    expect(mocks.history).not.toHaveBeenCalled();
  });

  it("hides unexpected monitoring error details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private database connection detail"));
    const html = await render();
    expect(html).toContain("Não foi possível carregar o monitoramento agora.");
    expect(html).not.toContain("private database connection detail");
    expect(mocks.alerts).not.toHaveBeenCalled();
    expect(mocks.history).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
