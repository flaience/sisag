import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  renew: vi.fn(),
  release: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("@/modules/commercial/commercial-post-activation-runner-lease.service", () => ({
  acquireCommercialPostActivationRunnerLease: mocks.acquire,
  renewCommercialPostActivationRunnerLease: mocks.renew,
  releaseCommercialPostActivationRunnerLease: mocks.release,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const input = {
  action: "acquire",
  runnerKey: "post_activation_due_runner",
  ownerKey: "n8n-execution-501",
  ttlSeconds: 600,
};

function request(body: unknown = input) {
  return new Request("http://localhost/manage-post-activation-runner-lease", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST commercial manage-post-activation-runner-lease", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before accessing the lease", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request())).toBe(denied);
    expect(mocks.acquire).not.toHaveBeenCalled();
  });

  it("acquires the lease", async () => {
    mocks.acquire.mockResolvedValue({
      ok: true,
      acquired: true,
      runnerKey: input.runnerKey,
      ownerKey: input.ownerKey,
      expiresAt: "2026-08-21T18:10:00.000Z",
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        action: "acquire",
        acquired: true,
        runnerKey: input.runnerKey,
        ownerKey: input.ownerKey,
        expiresAt: "2026-08-21T18:10:00.000Z",
      },
    });
    expect(mocks.acquire).toHaveBeenCalledWith(input);
  });

  it("reports contention as a successful controlled response", async () => {
    mocks.acquire.mockResolvedValue({ ok: true, acquired: false, runnerKey: input.runnerKey });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { action: "acquire", acquired: false, runnerKey: input.runnerKey },
    });
  });

  it("renews the lease", async () => {
    const payload = { ...input, action: "renew" };
    mocks.renew.mockResolvedValue({
      ok: true,
      renewed: true,
      runnerKey: input.runnerKey,
      ownerKey: input.ownerKey,
      expiresAt: "2026-08-21T18:15:00.000Z",
    });
    const response = await POST(request(payload));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { action: "renew", renewed: true },
    });
    expect(mocks.renew).toHaveBeenCalledWith(payload);
  });

  it("releases the lease", async () => {
    const payload = { action: "release", runnerKey: input.runnerKey, ownerKey: input.ownerKey };
    mocks.release.mockResolvedValue({ ok: true, released: true, runnerKey: input.runnerKey });
    const response = await POST(request(payload));
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { action: "release", released: true, runnerKey: input.runnerKey },
    });
    expect(mocks.release).toHaveBeenCalledWith(payload);
  });

  it("returns 400 for an unsupported action", async () => {
    const response = await POST(request({ ...input, action: "steal" }));
    expect(response.status).toBe(400);
    expect(mocks.acquire).not.toHaveBeenCalled();
    expect(mocks.renew).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("maps controlled validation failures to 400", async () => {
    mocks.acquire.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Identidade ou duração da lease do runner inválida.",
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "COMMERCIAL_INVALID_INPUT" },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.acquire).not.toHaveBeenCalled();
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.acquire.mockRejectedValue(new Error("private lease database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "COMMERCIAL_UNKNOWN_ERROR" },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
