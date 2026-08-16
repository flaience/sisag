import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), alerts: vi.fn(), history: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-alert-history.service", () => ({
  listCommercialPostActivationAlertHistory: mocks.history,
}));
vi.mock("@/modules/commercial/commercial-post-activation-monitoring-query.service", () => ({
  listCommercialPostActivationMonitoring: mocks.query,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-query.service", () => ({
  listCommercialPostActivationAlerts: mocks.alerts,
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
  PostActivationAlertHistoryPanel: ({ data }: { data: { items: unknown[] } | null }) => (
    <div>history-items:{data?.items.length ?? "unavailable"}</div>
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
  });

  it("loads and renders monitoring, active alerts and alert history", async () => {
    const html = await render();
    expect(html).toContain("Acompanhamento pós-ativação");
    expect(html).toContain("dashboard-items:1");
    expect(html).toContain("alert-items:1");
    expect(html).toContain("history-items:1");
    expect(mocks.query).toHaveBeenCalledWith({ status: undefined, limit: undefined });
    expect(mocks.alerts).toHaveBeenCalledWith({ limit: 10 });
    expect(mocks.history).toHaveBeenCalledWith({ limit: 10 });
  });

  it("forwards URL filters to the server monitoring query", async () => {
    const html = await render({ status: "escalated", limit: "10" });
    expect(html).toContain("Escalonados");
    expect(mocks.query).toHaveBeenCalledWith({ status: "escalated", limit: 10 });
  });

  it("uses the first value for repeated query parameters", async () => {
    await render({ status: ["overdue", "completed"], limit: ["5", "100"] });
    expect(mocks.query).toHaveBeenCalledWith({ status: "overdue", limit: 5 });
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
