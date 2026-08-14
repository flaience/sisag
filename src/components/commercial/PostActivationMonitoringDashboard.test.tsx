import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationMonitoringDashboard } from "./PostActivationMonitoringDashboard";

function data(overrides: Record<string, unknown> = {}) {
  return {
    items: [{
      onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
      commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
      clientName: "Clínica Exemplo",
      clientStatus: "active" as const,
      monitoring: {
        onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
        planKey: "plan-1",
        status: "overdue" as const,
        currentMilestone: {
          code: "adoption_d1",
          title: "Primeira verificação de adoção",
          ownerType: "agent" as const,
          dueAt: "2026-08-14T12:00:00.000Z",
        },
        processedMilestones: 1,
        completedMilestones: 1,
        escalatedMilestones: 0,
        totalMilestones: 5,
        missingIndicators: ["first_login", "scheduling_activity"],
        activeEscalations: [],
        lastProcessedAt: "2026-08-13T12:00:00.000Z",
        supportWindowEndsAt: "2026-08-27T12:00:00.000Z",
        supportWindowExpired: false,
      },
    }],
    summary: { scheduled: 0, waiting: 0, overdue: 1, escalated: 0, completed: 0 },
    invalidRecords: 0,
    failures: [],
    ...overrides,
  };
}

describe("PostActivationMonitoringDashboard", () => {
  it("renders summary and prioritized client information", () => {
    const html = renderToStaticMarkup(<PostActivationMonitoringDashboard data={data()} />);
    expect(html).toContain("Atenção imediata");
    expect(html).toContain("Clínica Exemplo");
    expect(html).toContain("Atrasado");
    expect(html).toContain("Adoção D+1");
    expect(html).toContain("1/5 marcos concluídos");
  });

  it("translates missing indicators into operational labels", () => {
    const html = renderToStaticMarkup(<PostActivationMonitoringDashboard data={data()} />);
    expect(html).toContain("Primeiro acesso");
    expect(html).toContain("Atividade de agenda");
    expect(html).not.toContain("first_login");
  });

  it("prioritizes active escalation labels", () => {
    const base = data();
    const item = base.items[0]!;
    const html = renderToStaticMarkup(<PostActivationMonitoringDashboard data={{
      ...base,
      items: [{
        ...item,
        monitoring: {
          ...item.monitoring,
          status: "escalated",
          activeEscalations: ["customer_risk_reported"],
        },
      }],
      summary: { ...base.summary, overdue: 0, escalated: 1 },
    }} />);
    expect(html).toContain("Escalonado");
    expect(html).toContain("customer risk reported");
    expect(html).not.toContain("Primeiro acesso");
  });

  it("renders an empty state", () => {
    const html = renderToStaticMarkup(<PostActivationMonitoringDashboard data={data({
      items: [],
      summary: { scheduled: 0, waiting: 0, overdue: 0, escalated: 0, completed: 0 },
    })} />);
    expect(html).toContain("Nenhum acompanhamento encontrado");
  });

  it("warns about invalid records without exposing failure details", () => {
    const html = renderToStaticMarkup(<PostActivationMonitoringDashboard data={data({
      invalidRecords: 1,
      failures: [{
        onboardingId: "33164020-8778-4226-afed-189e8d2333cc",
        error: "private_invalid_state_detail",
      }],
    })} />);
    expect(html).toContain("1 registro(s) não puderam ser interpretados");
    expect(html).not.toContain("private_invalid_state_detail");
  });
});
