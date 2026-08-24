import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationDueWorkDeferralPanel } from "./PostActivationDueWorkDeferralPanel";

const data = {
  recordedAt: "2026-08-24T20:30:00.000Z",
  status: "degraded" as const,
  total: 1,
  waiting: 1,
  escalated: 0,
  filteredTotal: 1,
  limit: 25,
  offset: 0,
  hasNext: false,
  items: [{
    workId: "53164020-8778-4226-afed-189e8d2333cc",
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    milestoneCode: "adoption_d1",
    status: "scheduled" as const,
    deferredCount: 10,
    firstDeferredAt: "2026-08-24T18:30:00.000Z",
    lastDeferredAt: "2026-08-24T20:15:00.000Z",
    lastDeferralReason: "business_wait" as const,
    escalationRequired: false,
    availableAt: "2026-08-24T20:45:00.000Z",
    waitAgeSeconds: 7200,
    waitDeadlineAt: "2026-08-25T18:30:00.000Z",
    waitRemainingSeconds: 79200,
    nextAvailableInSeconds: 900,
  }],
};

describe("PostActivationDueWorkDeferralPanel", () => {
  it("renders durable waiting details", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkDeferralPanel data={data} filters={{}} />);
    expect(html).toContain("Esperas e escalonamentos");
    expect(html).toContain("Em espera");
    expect(html).toContain("adoption_d1");
    expect(html).toContain("Aguardando condição de negócio");
    expect(html).toContain("15min");
    expect(html).toContain("10");
  });

  it("highlights escalated work", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkDeferralPanel data={{
      ...data,
      status: "critical",
      waiting: 0,
      escalated: 1,
      items: [{
        ...data.items[0],
        escalationRequired: true,
        lastDeferralReason: "deferral_limit_reached",
      }],
    }} filters={{ state: "escalated" }} />);
    expect(html).toContain("Ação necessária");
    expect(html).toContain("Limite de adiamentos atingido");
    expect(html).toContain("Intervenção necessária");
  });

  it("preserves filters in form and pagination", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkDeferralPanel data={{
      ...data,
      filteredTotal: 40,
      limit: 10,
      offset: 10,
      hasNext: true,
    }} filters={{ state: "waiting", limit: 10, offset: 10 }} preservedFilters={{ status: "overdue", slaLimit: 25 }} />);
    expect(html).toContain('name="status" value="overdue"');
    expect(html).toContain('name="slaLimit" value="25"');
    expect(html).toContain("Anterior");
    expect(html).toContain("Próxima");
    expect(html).toContain("11–11 de 40");
  });

  it("renders an independent unavailable state", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkDeferralPanel data={null} filters={{}} />);
    expect(html).toContain("Indicadores temporariamente indisponíveis");
    expect(html).toContain("Os demais dados permanecem acessíveis");
  });
});
