import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ synchronize: vi.fn(), validate: vi.fn() }));
vi.mock(
  "@/modules/commercial/commercial-post-activation-alert-occurrence-sync.service",
  () => ({
    synchronizeCommercialPostActivationAlertOccurrenceRegistry: mocks.synchronize,
  }),
);
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const request = () => new Request(
  "http://localhost/synchronize-post-activation-alert-occurrences",
  { method: "POST" },
);

describe("POST commercial synchronize-post-activation-alert-occurrences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before synchronizing", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request())).toBe(denied);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it("returns the controlled synchronization summary", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: true,
      activeAlerts: 2,
      resolvedActions: 1,
      observed: 2,
      resolved: 1,
      replayedResolutions: 0,
      missingOccurrences: 0,
      invalidRecords: 0,
      historyTruncated: false,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        activeAlerts: 2,
        resolvedActions: 1,
        observed: 2,
        resolved: 1,
        replayedResolutions: 0,
        missingOccurrences: 0,
        invalidRecords: 0,
        historyTruncated: false,
      },
    });
    expect(mocks.synchronize).toHaveBeenCalledWith();
  });

  it.each([
    "alert_query_failed",
    "history_query_failed",
    "synchronization_failed",
  ])("maps %s to an unavailable response", async (error) => {
    mocks.synchronize.mockResolvedValue({
      ok: false,
      error,
      message: "private controlled detail",
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_ALERT_OCCURRENCE_SYNC_UNAVAILABLE",
        message: "Não foi possível sincronizar as ocorrências dos alertas pós-ativação.",
      },
    });
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.synchronize.mockRejectedValue(new Error("private occurrence database detail"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível sincronizar as ocorrências dos alertas pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: true,
      activeAlerts: 0,
      resolvedActions: 0,
      observed: 0,
      resolved: 0,
      replayedResolutions: 0,
      missingOccurrences: 0,
      invalidRecords: 0,
      historyTruncated: false,
    });

    await POST(request());

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
