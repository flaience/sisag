import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ plan: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-executor.service", () => ({
  planCommercialOnboardingExecution: mocks.plan,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const request = (query = "") => new Request(`http://localhost/plan-onboarding-execution${query}`);

describe("GET commercial plan-onboarding-execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before planning", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await GET(request(`?onboardingId=${onboardingId}`))).toBe(denied);
    expect(mocks.plan).not.toHaveBeenCalled();
  });

  it.each([
    [`?onboardingId=${onboardingId}`, { onboardingId, commercialClientId: undefined }],
    [`?commercialClientId=${commercialClientId}`, { onboardingId: undefined, commercialClientId }],
  ] as const)("forwards the identifier from %s", async (search, expected) => {
    mocks.plan.mockResolvedValue({
      ok: true,
      decision: "execute_agent",
      reason: "A etapa atual está pronta para execução por um agente.",
      command: {
        key: `${onboardingId}:configure_company:start`,
        action: "start",
        onboardingId,
        commercialClientId,
        stepCode: "configure_company",
        stepPosition: 2,
        executorType: "agent",
        input: {},
      },
      snapshot: { onboardingStatus: "in_progress", currentStepCode: "configure_company", progressPercentage: 13 },
    });
    const response = await GET(request(search));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        decision: "execute_agent",
        command: { stepCode: "configure_company", action: "start" },
        snapshot: { progressPercentage: 13 },
      },
    });
    expect(mocks.plan).toHaveBeenCalledWith(expected);
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["query_failed", 500, "COMMERCIAL_ONBOARDING_QUERY_FAILED"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.plan.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await GET(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("forwards ambiguous identifiers for domain validation", async () => {
    mocks.plan.mockResolvedValue({ ok: false, error: "invalid_input", message: "Informe exatamente um identificador." });
    const response = await GET(request(`?onboardingId=${onboardingId}&commercialClientId=${commercialClientId}`));
    expect(response.status).toBe(400);
    expect(mocks.plan).toHaveBeenCalledWith({ onboardingId, commercialClientId });
  });

  it("does not expose unexpected planner errors", async () => {
    mocks.plan.mockRejectedValue(new Error("private executor detail"));
    const response = await GET(request(`?onboardingId=${onboardingId}`));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível planejar a execução do onboarding comercial.",
      },
    });
  });
});
