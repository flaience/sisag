import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SchedulingSummaryCards } from "./SchedulingSummaryCards";

describe("SchedulingSummaryCards", () => {
  it("presents the operational scheduling summary without technical vocabulary", () => {
    const html = renderToStaticMarkup(
      <SchedulingSummaryCards summary={{ total: 8, pending: 2, confirmed: 3, completed: 2, cancelled: 1 }} />,
    );
    expect(html).toContain("Resumo dos agendamentos");
    expect(html).toContain("No período");
    expect(html).toContain("Confirmados");
    expect(html).not.toMatch(/booking|appointment/i);
  });
});
