import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ project: vi.fn(), validate: vi.fn() }));

vi.mock(
  "@/modules/commercial/commercial-post-activation-due-work-projection-runner.service",
  () => ({ projectCommercialPostActivationDueWork: mocks.project }),
);
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const cursor = "23164020-8778-4226-afed-189e8d2333cc";
const request = (body?: unknown) => new Request(
  "http://localhost/project-post-activation-due-work",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  },
);

const summary = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  scanned: 4,
  cursor,
  wrapped: false,
  synchronized: 3,
  failed: 1,
  created: 2,
  updated: 1,
  preserved: 11,
  completed: 1,
  failures: [{ onboardingId: cursor, error: "invalid_plan" }],
  ...overrides,
});

describe("POST project post-activation due work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading or projecting", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request({ limit: 10 }))).toBe(denied);
    expect(mocks.project).not.toHaveBeenCalled();
  });

  it("projects a bounded page and returns its synchronization summary", async () => {
    mocks.project.mockResolvedValue(summary());

    const response = await POST(request({ limit: 10, cursor }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        scanned: 4,
        cursor,
        wrapped: false,
        synchronized: 3,
        failed: 1,
        created: 2,
        updated: 1,
        preserved: 11,
        completed: 1,
        failures: [{ onboardingId: cursor, error: "invalid_plan" }],
      },
    });
    expect(mocks.project).toHaveBeenCalledWith({ limit: 10, cursor });
  });

  it("accepts an empty body and uses projection defaults", async () => {
    mocks.project.mockResolvedValue(summary({
      scanned: 0,
      cursor: null,
      synchronized: 0,
      failed: 0,
      created: 0,
      updated: 0,
      preserved: 0,
      completed: 0,
      failures: [],
    }));

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.project).toHaveBeenCalledWith({});
  });

  it("maps invalid projection input to HTTP 400", async () => {
    mocks.project.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "O limite deve ser positivo.",
    });

    const response = await POST(request({ limit: 0 }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "O limite deve ser positivo.",
      },
    });
  });

  it("rejects malformed JSON before projecting", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.project).not.toHaveBeenCalled();
  });

  it("does not expose unexpected infrastructure errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.project.mockRejectedValue(new Error("private database detail"));

    const response = await POST(request({ limit: 10 }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível projetar os trabalhos pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.project.mockResolvedValue(summary());

    await POST(request({ limit: 5 }));

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
