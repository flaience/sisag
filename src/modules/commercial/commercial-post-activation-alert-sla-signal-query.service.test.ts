import { describe, expect, it, vi } from "vitest";
import { listCommercialPostActivationAlertSlaSignals } from "./commercial-post-activation-alert-sla-signal-query.service";

const signal = {
  key: "alert-1:sla_resolution_breached",
  alertKey: "alert-1",
  type: "resolution_breached" as const,
  severity: "critical" as const,
  priority: "critical" as const,
  elapsedMinutes: 300,
  targetMinutes: 240,
  overdueMinutes: 60,
};

function dependencies() {
  return {
    querySla: vi.fn().mockResolvedValue({
      ok: true,
      data: { items: [{ alertKey: "alert-1" }], invalidRecords: 2 },
    }),
    projectSignals: vi.fn().mockReturnValue({
      ok: true,
      data: {
        signals: [
          signal,
          {
            ...signal,
            key: "alert-2:sla_acknowledgement_breached",
            alertKey: "alert-2",
            type: "acknowledgement_breached",
            severity: "high",
            priority: "high",
          },
        ],
        summary: {},
      },
    }),
  };
}

describe("commercial post-activation alert SLA signal query", () => {
  it("loads the complete SLA recorte and returns actionable signals", async () => {
    const deps = dependencies();
    const result = await listCommercialPostActivationAlertSlaSignals(deps);

    expect(deps.querySla).toHaveBeenCalledWith({ limit: 1000, offset: 0 });
    expect(deps.projectSignals).toHaveBeenCalledWith({ items: [{ alertKey: "alert-1" }] });
    expect(result).toMatchObject({
      ok: true,
      data: {
        signals: [{ alertKey: "alert-1" }, { alertKey: "alert-2" }],
        summary: {
          total: 2,
          critical: 1,
          acknowledgementBreached: 1,
          resolutionBreached: 1,
        },
        sourceInvalidRecords: 2,
      },
    });
  });

  it("filters signals and summarizes the complete filtered recorte before limiting", async () => {
    const deps = dependencies();
    deps.projectSignals.mockReturnValue({
      ok: true,
      data: { signals: [signal, { ...signal, key: "alert-3", alertKey: "alert-3" }], summary: {} },
    });

    const result = await listCommercialPostActivationAlertSlaSignals({
      ...deps,
      severity: "critical",
      type: "resolution_breached",
      limit: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      data: { signals: [{ alertKey: "alert-1" }], summary: { total: 2, critical: 2 } },
    });
  });

  it("rejects invalid filters before loading SLA data", async () => {
    const deps = dependencies();
    const result = await listCommercialPostActivationAlertSlaSignals({
      ...deps,
      severity: "urgent" as never,
    });
    expect(result).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Filtros dos sinais de SLA dos alertas inválidos.",
    });
    expect(deps.querySla).not.toHaveBeenCalled();
  });

  it("maps a controlled SLA query failure without exposing details", async () => {
    const deps = dependencies();
    deps.querySla.mockResolvedValue({ ok: false, error: "invalid_sla_data", message: "private" });
    await expect(listCommercialPostActivationAlertSlaSignals(deps)).resolves.toEqual({
      ok: false,
      error: "invalid_sla_data",
      message: "Não foi possível consultar os dados de SLA para projetar os sinais.",
    });
    expect(deps.projectSignals).not.toHaveBeenCalled();
  });

  it("maps invalid signal projections to a controlled failure", async () => {
    const deps = dependencies();
    deps.projectSignals.mockReturnValue({ ok: false, error: "invalid_input", message: "private" });
    await expect(listCommercialPostActivationAlertSlaSignals(deps)).resolves.toEqual({
      ok: false,
      error: "invalid_signal_data",
      message: "Não foi possível projetar os sinais de SLA dos alertas.",
    });
  });

  it("keeps unexpected storage failures observable", async () => {
    const deps = dependencies();
    const failure = new Error("database unavailable");
    deps.querySla.mockRejectedValue(failure);
    await expect(listCommercialPostActivationAlertSlaSignals(deps)).rejects.toBe(failure);
  });
});
