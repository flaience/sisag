import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST as generate } from "@/app/api/v1/settings/booking-followups/recovery/[id]/recommendation/route";
import { POST as review } from "@/app/api/v1/settings/booking-followups/recovery/[id]/recommendation/review/route";
const m = vi.hoisted(() => ({ auth: vi.fn(), generate: vi.fn(), review: vi.fn(),
  agent: vi.fn(), embedding: vi.fn(), experiment: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: m.auth }));
vi.mock("@/modules/automation/BookingRecoveryRecommendation.service", () => ({ BookingRecoveryRecommendationService: { generate: m.generate } }));
vi.mock("@/modules/automation/BookingRecoveryRecommendationReview.service", () => ({ BookingRecoveryRecommendationReviewService: { review: m.review } }));
vi.mock("@/modules/agents/RecoveryAgentProvider.factory", () => ({ createConfiguredRecoveryAgent: m.agent }));
vi.mock("@/modules/agents/RecoveryEmbeddingProvider.factory", () => ({ createConfiguredRecoveryEmbedding: m.embedding }));
vi.mock("@/modules/agents/RecoveryRetrievalShadowExperimentRuntime.service", () => ({ RecoveryRetrievalShadowExperimentRuntimeService: { resolve: m.experiment } }));
vi.mock("@/modules/agents/RecoveryRetrievalReleasePlanRuntime.service", () => ({ RecoveryRetrievalReleasePlanRuntimeService: { resolve: m.release } }));
const companyId = "authenticated-company", userId = "authenticated-actor", caseId = "route-case";
const context = () => ({ params: Promise.resolve({ id: caseId }) });
function request(body: unknown = {}) {
  return new NextRequest("https://sisag.test/api/recovery", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}
beforeEach(() => {
  for (const mock of Object.values(m)) mock.mockReset();
  m.auth.mockResolvedValue({ ok: true, auth: { companyId, userId } });
  m.generate.mockResolvedValue({ ok: true, recommendation: { status: "shadow" } });
  m.review.mockResolvedValue({ ok: true, alreadyReviewed: false, status: "accepted" });
  m.experiment.mockResolvedValue(null); m.release.mockResolvedValue(null);
  m.agent.mockReturnValue(undefined); m.embedding.mockReturnValue(undefined);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
// Real handlers, schema and NextResponse. Auth/session verification, services,
// provider factories and persistence are mocked: not a live HTTP/RLS test.
describe("recovery HTTP handler boundaries", () => {
  for (const [name, handler] of [["generate", generate], ["review", review]] as const) {
    it.each([401, 403])(`${name} returns auth denial %i before downstream calls`, async status => {
      const denied = NextResponse.json({ error: "denied" }, { status });
      m.auth.mockResolvedValue({ ok: false, response: denied });
      const req = request();
      expect(await handler(req, context())).toBe(denied);
      expect(m.auth).toHaveBeenCalledWith(req, ["owner", "admin", "staff"]);
      for (const mock of [m.generate, m.review, m.agent, m.embedding, m.experiment, m.release]) expect(mock).not.toHaveBeenCalled();
    });
  }
  it("uses authenticated identity and route case for generation, ignoring body identity", async () => {
    const req = request({ companyId: "attacker", actorId: "attacker", caseId: "attacker" });
    const response = await generate(req, context());
    expect(response.status).toBe(200);
    expect(m.auth).toHaveBeenCalledWith(req, ["owner", "admin", "staff"]);
    expect(m.generate).toHaveBeenCalledExactlyOnceWith({ companyId, caseId, actorId: userId,
      agent: undefined, semantic: { experiment: null, release: null } });
    for (const mock of [m.experiment, m.release])
      expect(mock).toHaveBeenCalledExactlyOnceWith({ companyId, caseId, scope: "recovery" });
  });
  it("maps a missing active recovery case to 404", async () => {
    m.generate.mockResolvedValue({ ok: false, error: "active_recovery_case_not_found" });
    const response = await generate(request(), context());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "active_recovery_case_not_found" });
  });
  it.each([
    { decision: "accepted", version: 0 },
    { decision: "adjusted", version: 1 },
    { decision: "rejected", version: 1 },
  ])("rejects invalid review payload %j before the service", async body => {
    const response = await review(request(body), context());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "invalid_payload" });
    expect(m.review).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON without invoking review", async () => {
    const req = new NextRequest("https://sisag.test/api/recovery", { method: "POST", body: "{" });
    expect((await review(req, context())).status).toBe(400);
    expect(m.review).not.toHaveBeenCalled();
  });
  it("takes review identity from authentication and strips extra body fields", async () => {
    const req = request({ decision: "accepted", version: 3, companyId: "attacker", actorId: "attacker", caseId: "attacker" });
    expect((await review(req, context())).status).toBe(200);
    expect(m.auth).toHaveBeenCalledWith(req, ["owner", "admin", "staff"]);
    expect(m.review).toHaveBeenCalledExactlyOnceWith({ companyId, caseId, actorId: userId,
      command: { decision: "accepted", version: 3 } });
    for (const mock of [m.generate, m.agent, m.embedding, m.experiment, m.release]) expect(mock).not.toHaveBeenCalled();
  });
  it.each([
    ["recommendation_not_found", 404],
    ["stale_recommendation", 409],
    ["concurrent_review", 409],
  ] as const)("maps review error %s to %i", async (error, status) => {
    m.review.mockResolvedValue({ ok: false, error });
    const response = await review(request({ decision: "accepted", version: 3 }), context());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ ok: false, error });
  });
  it("preserves the already-reviewed response", async () => {
    const result = { ok: true, alreadyReviewed: true, status: "accepted" };
    m.review.mockResolvedValue(result);
    const response = await review(request({ decision: "accepted", version: 3 }), context());
    expect(response.status).toBe(200); expect(await response.json()).toEqual(result);
  });
});
