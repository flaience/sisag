import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-query.service", () => ({
  getCommercialOnboardingQuery: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const request = (query = "") => new Request(`http://localhost/get-onboarding${query}`);

describe("GET commercial get-onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns the authentication response before querying", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await GET(request(`?onboardingId=${onboardingId}`))).toBe(denied);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it.each([
    [`?onboardingId=${onboardingId}`, { onboardingId, commercialClientId: undefined }],
    [`?commercialClientId=${commercialClientId}`, { onboardingId: undefined, commercialClientId }],
  ] as const)("forwards a supported identifier from %s", async (search, expected) => {
    mocks.query.mockResolvedValue({
      ok: true,
      data: {
        onboarding: { id: onboardingId, status: "in_progress" },
        progress: { total: 8, completed: 1, pending: 7, percentage: 13 },
        currentStep: { code: "configure_company" },
        steps: [],
      },
    });
    const response = await GET(request(search));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { progress: { total: 8, completed: 1, percentage: 13 } },
    });
    expect(mocks.query).toHaveBeenCalledWith(expected);
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.query.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await GET(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("forwards both identifiers so the domain validation can reject ambiguity", async () => {
    mocks.query.mockResolvedValue({ ok: false, error: "invalid_input", message: "Informe exatamente um identificador." });
    const response = await GET(request(`?onboardingId=${onboardingId}&commercialClientId=${commercialClientId}`));
    expect(response.status).toBe(400);
    expect(mocks.query).toHaveBeenCalledWith({ onboardingId, commercialClientId });
  });

  it("does not expose unexpected query errors", async () => {
    mocks.query.mockRejectedValue(new Error("private database detail"));
    const response = await GET(request(`?onboardingId=${onboardingId}`));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar o onboarding comercial.",
      },
    });
  });
});
