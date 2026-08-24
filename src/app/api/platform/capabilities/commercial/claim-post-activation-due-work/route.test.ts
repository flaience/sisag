import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ claim: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-claim.service", () => ({
  claimCommercialPostActivationDueWork: mocks.claim,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const workerKey = "worker:saopaulo-1";
const payload = { workerKey, limit: 10, lockSeconds: 300 };
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/claim-post-activation-due-work",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);
const item = {
  id: "53164020-8778-4226-afed-189e8d2333cc",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  milestoneCode: "welcome",
  status: "processing",
  dueAt: "2026-08-23T17:00:00.000Z",
  availableAt: "2026-08-23T17:00:00.000Z",
  priority: 100,
  attempts: 1,
  lockedUntil: "2026-08-23T18:05:00.000Z",
  lockedBy: workerKey,
};

describe("POST commercial claim-post-activation-due-work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request())).toBe(denied);
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("returns a bounded claimed batch", async () => {
    mocks.claim.mockResolvedValue({
      ok: true,
      workerKey,
      claimed: 1,
      lockedUntil: item.lockedUntil,
      items: [item],
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        workerKey,
        claimed: 1,
        lockedUntil: item.lockedUntil,
        items: [item],
      },
    });
    expect(mocks.claim).toHaveBeenCalledWith(payload);
  });

  it("returns an empty successful batch when no work is available", async () => {
    mocks.claim.mockResolvedValue({
      ok: true,
      workerKey,
      claimed: 0,
      lockedUntil: "2026-08-23T18:05:00.000Z",
      items: [],
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { claimed: 0, items: [] },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid claim input", async () => {
    mocks.claim.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Dados para reivindicação dos trabalhos pós-ativação inválidos.",
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_INPUT" },
    });
  });

  it("does not expose inconsistent storage details", async () => {
    mocks.claim.mockResolvedValue({
      ok: false,
      error: "invalid_claimed_work",
      message: "private claimed work detail",
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_CLAIMED_WORK",
        message: "Os trabalhos reivindicados estão inconsistentes.",
      },
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.claim.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível reivindicar os trabalhos pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.claim.mockResolvedValue({
      ok: true, workerKey, claimed: 0, lockedUntil: item.lockedUntil, items: [],
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
