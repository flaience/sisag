import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SchedulingSelectionSummary } from "./SchedulingSelectionSummary";

describe("SchedulingSelectionSummary", () => {
  it("shows a human-readable review of the selected appointment", () => {
    const html = renderToStaticMarkup(<SchedulingSelectionSummary clientName="Maria" professionalName="Dra. Ana" serviceName="Consulta" date="2026-08-28" time="09:30" durationMinutes={45} />);
    expect(html).toContain("Resumo do agendamento");
    expect(html).toContain("Maria");
    expect(html).toContain("45 min");
    expect(html).not.toMatch(/booking|appointment/i);
  });

  it("makes incomplete choices explicit", () => {
    const html = renderToStaticMarkup(<SchedulingSelectionSummary />);
    expect(html).toContain("Não selecionado");
    expect(html).toContain("A definir");
  });
});
