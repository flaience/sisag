import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-monitoring-query.service", () => ({
  listCommercialPostActivationMonitoring: mocks.query,
}));
vi.mock("@/components/commercial/PostActivationMonitoringDashboard", () => ({
  PostActivationMonitoringDashboard: ({ data }: { data: { items: unknown[] } }) => (
    <div>dashboard-items:{data.items.length}</div>
  ),
}));

import PlatformPostActivationPage from "./page";

const data = {
  items: [{ onboardingId: "23164020-8778-4226-afed-189e8d2333cc" }],
  summary: { scheduled: 0, waiting: 0, overdue: 1, escalated: 0, completed: 0 },
  invalidRecords: 0,
  failures: [],
};

async function render(searchParams: Record<string, string | string[] | undefined> = {}) {
  const component = await PlatformPostActivationPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(component);
}

describe("PlatformPostActivationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ ok: true, data });
  });

  it("loads and renders the monitoring dashboard", async () => {
    const html = await render();
    expect(html).toContain("Acompanhamento pós-ativação");
    expect(html).toContain("dashboard-items:1");
    expect(mocks.query).toHaveBeenCalledWith({ status: undefined, limit: undefined });
  });

  it("forwards URL filters to the server query", async () => {
    const html = await render({ status: "escalated", limit: "10" });
    expect(html).toContain("Escalonados");
    expect(mocks.query).toHaveBeenCalledWith({ status: "escalated", limit: 10 });
  });

  it("uses the first value for repeated query parameters", async () => {
    await render({ status: ["overdue", "completed"], limit: ["5", "100"] });
    expect(mocks.query).toHaveBeenCalledWith({ status: "overdue", limit: 5 });
  });

  it("renders controlled validation errors", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Filtro de monitoramento inválido.",
    });
    const html = await render({ limit: "invalid" });
    expect(html).toContain("Monitoramento indisponível");
    expect(html).toContain("Filtro de monitoramento inválido.");
    expect(html).not.toContain("dashboard-items");
  });

  it("hides unexpected error details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private database connection detail"));
    const html = await render();
    expect(html).toContain("Não foi possível carregar o monitoramento agora.");
    expect(html).not.toContain("private database connection detail");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
