import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostActivationProjectionAuditPanel } from "./PostActivationProjectionAuditPanel";

const data = {
  recordedAt: "2026-08-25T14:00:00.000Z",
  status: "collecting" as const,
  reasons: ["insufficient_observations" as const],
  requiredObservations: 8,
  observations: 2,
  matched: 2,
  divergent: 0,
  matchRatePercent: 100,
  firstObservedAt: "2026-08-25T13:30:00.000Z",
  lastObservedAt: "2026-08-25T13:45:00.000Z",
  wrappedObservations: 2,
  projectionFailures: 0,
  synchronized: 2,
  completed: 2,
  differences: {},
};

describe("PostActivationProjectionAuditPanel", () => {
  it("shows a collecting validation window", () => {
    const html = renderToStaticMarkup(<PostActivationProjectionAuditPanel data={data} />);
    expect(html).toContain("Validação do novo processamento");
    expect(html).toContain("Coletando evidências");
    expect(html).toContain("2/8");
    expect(html).toContain("100%");
    expect(html).toContain("Janela mínima de observações ainda incompleta");
    expect(html).toContain("Mantenha os dois caminhos ativos");
  });

  it("shows a ready recommendation without performing the cut", () => {
    const html = renderToStaticMarkup(<PostActivationProjectionAuditPanel data={{
      ...data,
      status: "ready",
      reasons: [],
      observations: 8,
      matched: 8,
    }} />);
    expect(html).toContain("Critérios atendidos");
    expect(html).toContain("preparar o corte em uma entrega separada");
    expect(html).not.toContain("Critérios pendentes ou bloqueadores");
  });

  it("highlights blockers and grouped differences", () => {
    const html = renderToStaticMarkup(<PostActivationProjectionAuditPanel data={{
      ...data,
      status: "blocked",
      reasons: ["divergence_detected", "projection_failure_detected"],
      matched: 1,
      divergent: 1,
      matchRatePercent: 50,
      projectionFailures: 1,
      differences: { cursor: 1, scanned: 2 },
    }} />);
    expect(html).toContain("Migração bloqueada");
    expect(html).toContain("Divergência entre projeção e runner legado");
    expect(html).toContain("Falha registrada durante a projeção");
    expect(html).toContain("scanned: 2");
    expect(html).toContain("cursor: 1");
  });

  it("renders an independent unavailable state", () => {
    const html = renderToStaticMarkup(<PostActivationProjectionAuditPanel data={null} />);
    expect(html).toContain("Histórico de comparação temporariamente indisponível");
    expect(html).toContain("O processamento permanece protegido");
  });
});
