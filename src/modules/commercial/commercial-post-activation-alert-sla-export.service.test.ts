import { describe, expect, it } from "vitest";
import { exportCommercialPostActivationAlertSlaCsv } from "./commercial-post-activation-alert-sla-export.service";

describe("exportCommercialPostActivationAlertSlaCsv", () => {
  it("exports SLA items with an Excel-compatible BOM", () => {
    const csv = exportCommercialPostActivationAlertSlaCsv([{
      alertKey: "alert-1",
      severity: "critical",
      lifecycle: "resolved",
      openedAt: "2026-08-20T12:00:00.000Z",
      acknowledgedAt: "2026-08-20T12:15:00.000Z",
      resolvedAt: "2026-08-20T13:00:00.000Z",
      acknowledgementMinutes: 15,
      resolutionMinutes: 60,
      acknowledgementTargetMinutes: 30,
      resolutionTargetMinutes: 240,
      acknowledgementBreached: false,
      resolutionBreached: false,
    }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"alert-1","critical","resolved"');
    expect(csv).toContain('"15","30","false","60","240","false"');
  });

  it("prevents spreadsheet formula injection", () => {
    const csv = exportCommercialPostActivationAlertSlaCsv([{
      alertKey: "=HYPERLINK(\"https://example.test\")",
      severity: "high", lifecycle: "new",
      openedAt: "2026-08-20T12:00:00.000Z", acknowledgedAt: null, resolvedAt: null,
      acknowledgementMinutes: 1, resolutionMinutes: 1,
      acknowledgementTargetMinutes: 120, resolutionTargetMinutes: 1440,
      acknowledgementBreached: false, resolutionBreached: false,
    }]);
    expect(csv).toContain("'=HYPERLINK");
  });
});
