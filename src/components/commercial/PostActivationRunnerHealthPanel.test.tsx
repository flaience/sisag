import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationRunnerHealthPanel } from "./PostActivationRunnerHealthPanel";

const snapshot = {
  runnerKey: "post_activation_due_runner",
  executionKey: "344",
  summary: {
    executedAt: "2026-08-17T20:15:13.046Z",
    scanned: 1,
    due: 1,
    processed: 1,
    failed: 0,
  },
  metrics: {
    totalRuns: 4,
    successfulRuns: 4,
    failedRuns: 0,
    consecutiveFailedRuns: 0,
    lastRunAt: "2026-08-17T20:15:13.046Z",
    lastSuccessfulRunAt: "2026-08-17T20:15:13.046Z",
    lastFailureAt: null,
    status: "healthy" as const,
  },
  executedAt: "2026-08-17T20:15:13.046Z",
};

describe("PostActivationRunnerHealthPanel", () => {
  it("renders durable healthy runner metrics", () => {
    const html = renderToStaticMarkup(<PostActivationRunnerHealthPanel data={snapshot} />);

    expect(html).toContain("Saúde do processamento automático");
    expect(html).toContain("Saudável");
    expect(html).toContain("Execuções");
    expect(html).toContain(">4<");
    expect(html).toContain("100% de sucesso");
    expect(html).toContain("ID 344");
  });

  it("renders critical consecutive failures", () => {
    const html = renderToStaticMarkup(<PostActivationRunnerHealthPanel data={{
      ...snapshot,
      metrics: {
        ...snapshot.metrics,
        failedRuns: 3,
        consecutiveFailedRuns: 3,
        lastFailureAt: "2026-08-17T20:15:13.046Z",
        status: "critical",
      },
    }} />);

    expect(html).toContain("Crítico");
    expect(html).toContain("Falhas consecutivas");
    expect(html).toContain("Requer acompanhamento");
  });

  it("renders an empty state before the first execution", () => {
    const html = renderToStaticMarkup(<PostActivationRunnerHealthPanel data={null} />);

    expect(html).toContain("Métricas ainda não disponíveis");
    expect(html).not.toContain("Falhas consecutivas");
  });
});
