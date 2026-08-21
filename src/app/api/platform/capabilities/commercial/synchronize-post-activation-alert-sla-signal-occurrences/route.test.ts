import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ synchronize: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-alert-sla-signal-occurrences.service", () => ({
  synchronizeCommercialPostActivationAlertSlaSignalOccurrences: mocks.synchronize,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const payload = { signals: [{ key: "signal-1", alertKey: "alert-1", type: "resolution_breached", severity: "critical" }] };
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/synchronize-post-activation-alert-sla-signal-occurrences",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);

describe("POST synchronize post-activation alert SLA signal occurrences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request())).toBe(denied);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it("returns the durable synchronization summary", async () => {
    mocks.synchronize.mockResolvedValue({ ok: true, created: 1, observed: 2, resolved: 3, active: 3 });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { created: 1, observed: 2, resolved: 3, active: 3 },
    });
    expect(mocks.synchronize).toHaveBeenCalledWith(payload);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid signal data", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Dados das ocorrências dos sinais de SLA inválidos.",
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Dados das ocorrências dos sinais de SLA inválidos.",
      },
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.synchronize.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível sincronizar as ocorrências dos sinais de SLA.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.synchronize.mockResolvedValue({ ok: true, created: 0, observed: 0, resolved: 0, active: 0 });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
