import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { bookingEvents, bookingRecoveryRecommendations } from "@/drizzle/schema";
import { BookingRecoveryRecommendationReviewService } from "./BookingRecoveryRecommendationReview.service";
import { BookingRecoveryRecommendationReviewSchema } from "./BookingRecoveryRecommendationReview.schema";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
const companyId = "00000000-0000-4000-8000-000000000001";
const caseId = "00000000-0000-4000-8000-000000000002";
const actorId = "00000000-0000-4000-8000-000000000003";
const now = new Date("2026-09-11T12:00:00Z");
const current = { id: "synthetic-recommendation", bookingId: "synthetic-booking", clientId: "synthetic-client",
  version: 3, status: "shadow", suggestedAction: "claim_case", suggestedPriority: "urgent" };
// Scripted DB boundary: checks service behavior, not real SQL isolation/atomicity.
function database(row: any = current, conflict = false) {
  const updates: any[] = [], events: any[] = [], filters: any[] = [];
  const db: any = {
    transaction: async (callback: any) => callback(db),
    select: vi.fn(() => ({ from(table: unknown) {
      expect(table).toBe(bookingRecoveryRecommendations);
      return { where(filter: any) {
        const params = new PgDialect().sqlToQuery(filter).params;
        expect(params).toContain(companyId); expect(params).toContain(caseId);
        return { limit: async () => row ? [row] : [] };
      } };
    } })),
    update: vi.fn((table: unknown) => {
      expect(table).toBe(bookingRecoveryRecommendations);
      return { set(value: any) {
        updates.push(value);
        return { where(filter: any) {
          filters.push(new PgDialect().sqlToQuery(filter).params);
          return { returning: async () => conflict ? [] : [{ id: row.id, status: value.status }] };
        } };
      } };
    }),
    insert: vi.fn((table: unknown) => {
      expect(table).toBe(bookingEvents);
      return { values: async (value: any) => { events.push(value); } };
    }),
  };
  mocks.getDb.mockReturnValue(db);
  return { db, updates, events, filters };
}
beforeEach(() => {
  mocks.getDb.mockReset(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("No external calls allowed"); }));
});
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const review = (command: unknown) => BookingRecoveryRecommendationReviewService.review({
  companyId, caseId, actorId, command: BookingRecoveryRecommendationReviewSchema.parse(command),
});
describe("isolated human recommendation review", () => {
  it.each(["accepted", "adjusted", "rejected"] as const)("records %s without executing the decision", async decision => {
    const h = database();
    const command = { decision, version: 3, note: "Revisão humana de teste",
      ...(decision === "adjusted" ? { decidedAction: "human_contact", decidedPriority: "high" } : {}) };
    expect(await review(command)).toEqual({ ok: true, alreadyReviewed: false, status: decision });
    const decidedAction = decision === "rejected" ? null : decision === "adjusted" ? "human_contact" : "claim_case";
    const decidedPriority = decision === "rejected" ? null : decision === "adjusted" ? "high" : "urgent";
    expect(h.updates).toEqual([expect.objectContaining({ status: decision, decidedAction, decidedPriority,
      reviewedVersion: 3, reviewedBy: actorId, reviewedAt: now, decisionNote: command.note })]);
    for (const value of [current.id, companyId, 3, "shadow"]) expect(h.filters[0]).toContain(value);
    expect(h.events).toEqual([expect.objectContaining({ companyId, bookingId: current.bookingId,
      clientId: current.clientId, actor: "admin", type: "automation.booking_recovery.recommendation_reviewed",
      payload: expect.objectContaining({ recoveryCaseId: caseId, recommendationId: current.id, actorId,
        version: 3, decision, decidedAction, decidedPriority }) })]);
    // Only the recommendation update and audit event are allowed by this DB double.
    expect(h.db.update).toHaveBeenCalledTimes(1);
    expect(h.db.insert).toHaveBeenCalledTimes(1);
  });
  it("rejects a stale version without writes", async () => {
    const h = database();
    expect(await review({ decision: "accepted", version: 2 })).toEqual({ ok: false, error: "stale_recommendation" });
    expect(h.db.update).not.toHaveBeenCalled(); expect(h.db.insert).not.toHaveBeenCalled();
  });
  it("handles a missing recommendation without writes", async () => {
    const h = database(null);
    expect(await review({ decision: "accepted", version: 3 })).toEqual({ ok: false, error: "recommendation_not_found" });
    expect(h.db.update).not.toHaveBeenCalled(); expect(h.db.insert).not.toHaveBeenCalled();
  });
  it("returns already reviewed without repeating the audit event", async () => {
    const h = database({ ...current, status: "accepted" });
    expect(await review({ decision: "accepted", version: 3 })).toEqual({ ok: true, alreadyReviewed: true, status: "accepted" });
    expect(h.db.update).not.toHaveBeenCalled(); expect(h.db.insert).not.toHaveBeenCalled();
  });
  it("reports a lost conditional update without an audit event", async () => {
    const h = database(current, true);
    expect(await review({ decision: "accepted", version: 3 })).toEqual({ ok: false, error: "concurrent_review" });
    expect(h.db.update).toHaveBeenCalledTimes(1); expect(h.db.insert).not.toHaveBeenCalled();
  });
  it("requires explanatory notes and adjusted fields at the schema boundary", () => {
    for (const command of [
      { decision: "rejected", version: 3 },
      { decision: "adjusted", version: 3, note: "Ajuste necessário" },
      { decision: "accepted", version: 0 },
    ]) expect(BookingRecoveryRecommendationReviewSchema.safeParse(command).success).toBe(false);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
