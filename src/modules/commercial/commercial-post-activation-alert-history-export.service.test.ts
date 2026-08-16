import { describe, expect, it } from "vitest";

import { exportCommercialPostActivationAlertHistoryCsv } from "./commercial-post-activation-alert-history-export.service";

const item = {
  idempotencyKey: "platform-alert:request-1",
  alertKey: "onboarding:milestone_overdue:welcome",
  action: "resolved" as const,
  actor: { type: "human" as const, id: "operator-1" },
  actedAt: "2026-08-15T23:24:01.000Z",
  note: "Resolvido, após contato",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  clientName: "Clínica Exemplo",
};

describe("post-activation alert history CSV export", () => {
  it("exports a UTF-8 CSV with stable columns", () => {
    const csv = exportCommercialPostActivationAlertHistoryCsv([item]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"cliente","cliente_id","onboarding_id","alerta","acao"');
    expect(csv).toContain('"Clínica Exemplo"');
    expect(csv).toContain('"resolved","human","operator-1"');
    expect(csv).toContain('"Resolvido, após contato"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("escapes quotes and neutralizes spreadsheet formulas", () => {
    const csv = exportCommercialPostActivationAlertHistoryCsv([{
      ...item,
      clientName: '=HYPERLINK("https://example.test")',
      note: '+SUM(1,1) "quoted"',
    }]);

    expect(csv).toContain(`"'=HYPERLINK(""https://example.test"")"`);
    expect(csv).toContain(`"'+SUM(1,1) ""quoted"""`);
  });

  it("exports only the header for an empty history", () => {
    const csv = exportCommercialPostActivationAlertHistoryCsv([]);

    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).not.toContain("undefined");
  });
});
