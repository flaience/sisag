import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardBookingsShadowAuditPanel } from "./DashboardBookingsShadowAuditPanel";

const summary = { total: 1, confirmed: 1, pending: 0, cancelled: 0, completed: 0, rescheduled: 0 };
const base = { recordedAt: "2026-08-26T18:00:00.000Z", status: "healthy" as const, evidencePresent: true, matched: true, differences: [], legacy: { today: summary, week: summary, upcoming: [] }, bookings: { today: summary, week: summary, upcoming: [] } };

describe("DashboardBookingsShadowAuditPanel", () => {
  it("asks for a company before observing", () => {
    const html = renderToStaticMarkup(<DashboardBookingsShadowAuditPanel companyId="" data={null} />);
    expect(html).toContain("Informe a empresa");
  });

  it("does not authorize an empty observation", () => {
    const data = {
      ...base,
      status: "insufficient_evidence" as const,
      evidencePresent: false,
    };
    const html = renderToStaticMarkup(
      <DashboardBookingsShadowAuditPanel companyId="company" data={data} />,
    );
    expect(html).toContain("Evidência insuficiente");
    expect(html).toContain("Crie uma amostra operacional representativa");
  });

  it("presents a compatible observation", () => {
    const html = renderToStaticMarkup(<DashboardBookingsShadowAuditPanel companyId="23164020-8778-4226-afed-189e8d2333cc" data={base} />);
    expect(html).toContain("Fontes compatíveis");
    expect(html).toContain("Nenhuma diferença encontrada");
  });

  it("presents divergences and keeps the current source", () => {
    const data = { ...base, matched: false, status: "divergent" as const, differences: [{ field: "today.total", legacy: 1, bookings: 2 }] };
    const html = renderToStaticMarkup(<DashboardBookingsShadowAuditPanel companyId="company" data={data} />);
    expect(html).toContain("Divergências encontradas");
    expect(html).toContain("Mantenha a fonte atual");
    expect(html).toContain("today.total");
  });
});
