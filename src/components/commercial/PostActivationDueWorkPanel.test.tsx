import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationDueWorkPanel } from "./PostActivationDueWorkPanel";

const snapshot = {
  recordedAt: "2026-08-23T16:00:00.000Z",
  status: "healthy" as const,
  reasons: [],
  total: 10,
  scheduled: 3,
  processing: 1,
  completed: 6,
  failed: 0,
  claimable: 2,
  overdue: 0,
  expiredLocks: 0,
  totalAttempts: 4,
  oldestOutstandingAt: "2026-08-23T15:00:00.000Z",
  oldestOutstandingAgeSeconds: 3600,
};

describe("PostActivationDueWorkPanel", () => {
  it("renders the healthy shadow queue snapshot", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkPanel data={snapshot} />);

    expect(html).toContain("Fila de trabalhos pós-ativação");
    expect(html).toContain("Saudável");
    expect(html).toContain("Agendados");
    expect(html).toContain("Processando");
    expect(html).toContain("Concluídos");
    expect(html).toContain("Backlog acionável");
    expect(html).toContain("2 acionável(is) agora");
    expect(html).toContain("Idade 1h");
  });

  it("highlights expired locks as critical", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkPanel data={{
      ...snapshot,
      status: "critical",
      reasons: ["expired_processing_locks"],
      processing: 2,
      completed: 5,
      expiredLocks: 1,
    }} />);

    expect(html).toContain("Crítica");
    expect(html).toContain("1 lock(s) expirado(s)");
    expect(html).toContain("Processamentos recuperáveis");
  });

  it("renders overdue and failed work", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkPanel data={{
      ...snapshot,
      status: "degraded",
      reasons: ["overdue_work", "failed_work"],
      scheduled: 2,
      completed: 6,
      failed: 1,
      overdue: 1,
    }} />);

    expect(html).toContain("Atenção");
    expect(html).toContain("Vencidos");
    expect(html).toContain("Exigem acompanhamento");
    expect(html).toContain("Falhos");
  });

  it("renders an independent unavailable state", () => {
    const html = renderToStaticMarkup(<PostActivationDueWorkPanel data={null} />);

    expect(html).toContain("Indicadores temporariamente indisponíveis");
    expect(html).toContain("Os demais dados permanecem acessíveis");
    expect(html).not.toContain("Backlog acionável");
  });
});
