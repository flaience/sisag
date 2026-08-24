import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ process: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-batch-processor.service", () => ({
  processCommercialPostActivationDueWorkBatch: mocks.process,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const payload = {
  workerKey: "post_activation_due_runner:901",
  limit: 25,
  concurrency: 5,
  lockSeconds: 300,
  deferSeconds: 900,
};
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/process-post-activation-due-work-batch",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);

describe("POST commercial process-post-activation-due-work-batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request())).toBe(denied);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns the bounded batch summary", async () => {
    const item = {
      workId: "53164020-8778-4226-afed-189e8d2333cc",
      onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
      milestoneCode: "welcome",
      outcome: "completed",
      decision: "completed",
      retryable: false,
      nextAvailableAt: null,
      error: null,
    };
    mocks.process.mockResolvedValue({
      ok: true,
      workerKey: payload.workerKey,
      claimed: 1,
      completed: 1,
      deferred: 0,
      escalated: 0,
      failed: 0,
      settlementFailed: 0,
      items: [item],
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        workerKey: payload.workerKey,
        claimed: 1,
        completed: 1,
        deferred: 0,
        escalated: 0,
        failed: 0,
        settlementFailed: 0,
        items: [item],
      },
    });
    expect(mocks.process).toHaveBeenCalledWith(payload);
  });

  it("returns an empty successful batch", async () => {
    mocks.process.mockResolvedValue({
      ok: true,
      workerKey: payload.workerKey,
      claimed: 0,
      completed: 0,
      deferred: 0,
      escalated: 0,
      failed: 0,
      settlementFailed: 0,
      items: [],
    });
    const response = await POST(request());
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { claimed: 0, items: [] },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid batch input", async () => {
    mocks.process.mockResolvedValue({
      ok: false, error: "invalid_input", message: "Dados inválidos.",
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_INPUT" },
    });
  });

  it("does not expose claim failure details", async () => {
    mocks.process.mockResolvedValue({
      ok: false, error: "claim_failed", message: "private claim detail",
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_DUE_WORK_BATCH_CLAIM_FAILED",
        message: "Não foi possível reivindicar o lote de trabalhos pós-ativação.",
      },
    });
  });

  it("does not expose unexpected infrastructure errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.process.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível processar o lote de trabalhos pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.process.mockResolvedValue({
      ok: true,
      workerKey: payload.workerKey,
      claimed: 0,
      completed: 0,
      deferred: 0,
      escalated: 0,
      failed: 0,
      settlementFailed: 0,
      items: [],
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
