import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { automationJobs, bookingEvents, bookingFeedbacks, bookingRecoveryCases, bookings, outbox } from "@/drizzle/schema";
import { BookingOperationalLifecycleService } from "@/modules/bookings/BookingOperationalLifecycle.service";
import { BookingFollowupPlannerService } from "./BookingFollowupPlanner.service";
import { BookingFollowupWorkerService } from "./BookingFollowupWorker.service";
import { BookingFollowupFeedbackService } from "./BookingFollowupFeedback.service";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), cancel: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("./BookingReminderPlanner.service", () => ({
  BookingReminderPlannerService: { cancelSafely: mocks.cancel },
}));

// Scripted persistence boundary, NOT a SQL engine. Real domain services run.
// These tests do not establish database isolation, durable transactions or delivery.
type Step = { op: string; table?: unknown; rows?: any[] | (() => any[]); check?: (data: any) => void };
function scriptedDb(steps: Step[]) {
  const remaining = [...steps];
  const observed: any[] = [];
  function operation(op: string, table?: unknown) {
    const step = remaining.shift();
    expect(step, "unexpected database operation: " + op).toBeDefined();
    expect(step!.op).toBe(op);
    const data: any = { op, table };
    let finished = false;
    let rows: any[];
    const finish = () => {
      if (!finished) {
        finished = true;
        if (step!.table) expect(data.table).toBe(step!.table);
        step!.check?.(data);
        rows = typeof step!.rows === "function" ? step!.rows() : step!.rows ?? [];
        observed.push(data);
      }
      return rows;
    };
    const chain: any = {
      from(value: unknown) { data.table = value; return chain; },
      innerJoin() { return chain; }, leftJoin() { return chain; }, orderBy() { return chain; },
      where(value: unknown) { data.where = value; return chain; },
      set(value: unknown) { data.set = value; return chain; },
      values(value: unknown) { data.values = value; return chain; },
      onConflictDoNothing(value: unknown) { data.conflict = value ?? true; return chain; },
      onConflictDoUpdate(value: unknown) { data.conflict = value; return chain; },
      limit() { return Promise.resolve(finish()); },
      returning() { return Promise.resolve(finish()); },
      then(resolve: any, reject: any) { return Promise.resolve().then(finish).then(resolve, reject); },
    };
    return chain;
  }
  const db: any = {
    select: () => operation("select"), insert: (table: unknown) => operation("insert", table),
    update: (table: unknown) => operation("update", table),
    execute: async (sql: unknown) => {
      const step = remaining.shift();
      expect(step?.op).toBe("execute");
      step?.check?.({ sql });
      return typeof step?.rows === "function" ? step.rows() : step?.rows ?? [];
    },
    transaction: async (callback: any) => callback(db),
  };
  mocks.getDb.mockReturnValue(db);
  return { observed, done: () => expect(remaining).toHaveLength(0) };
}
const companyId = "00000000-0000-4000-8000-000000000001";
const bookingId = "00000000-0000-4000-8000-000000000002";
const clientId = "00000000-0000-4000-8000-000000000003";
const completedAt = new Date("2026-09-11T12:00:00.000Z");
const runAt = new Date("2026-09-11T13:00:00.000Z");
const fixture = { bookingId, companyId, clientId, status: "COMPLETED", completedAt,
  clientPhone: "+15555550100", phone: "+15555550100", clientName: "Contato sintético",
  enabled: true, hoursAfter: 1, templates: null };
const target = { jobId: "synthetic-job", outboxId: "synthetic-outbox", bookingId };
function scoped(data: any, ...ids: string[]) {
  const params = new PgDialect().sqlToQuery(data.where).params;
  for (const id of ids) expect(params).toContain(id);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(completedAt);
  mocks.getDb.mockReset();
  mocks.cancel.mockResolvedValue({ ok: true, cancelled: 0 });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in isolated flow"); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("isolated completion to recovery flow (no delivery)", () => {
  it.each([[1, "urgent"], [2, "high"]] as const)("opens recovery for score %i after a real service chain", async (score, priority) => {
    let job: any;
    let queued: any;
    const harness = scriptedDb([
      { op: "select", table: bookings, rows: [{ id: bookingId, clientId, status: "IN_PROGRESS" }],
        check: d => scoped(d, companyId, bookingId) },
      { op: "update", table: bookings, rows: [{ id: bookingId, status: "COMPLETED" }],
        check: d => { scoped(d, companyId, bookingId, "IN_PROGRESS"); expect(d.set).toMatchObject({ status: "COMPLETED", completedAt }); } },
      { op: "insert", table: bookingEvents, check: d => expect(d.values).toMatchObject({ companyId, bookingId, type: "booking.completed" }) },
      { op: "select", table: bookings, rows: [fixture], check: d => scoped(d, companyId, bookingId) },
      { op: "update", table: automationJobs, check: d => scoped(d, companyId, bookingId) },
      { op: "insert", table: automationJobs, rows: [{ id: target.jobId }], check: d => {
        job = d.values;
        expect(job).toMatchObject({ companyId, bookingId, clientId, runAt, status: "pending", type: "followup" });
        expect(job.dedupeKey).toBe("booking-followup:" + bookingId + ":" + completedAt.toISOString());
      } },
      { op: "execute", rows: () => [{ ...job, id: target.jobId, attempts: 1 }], check: d => {
        expect(new PgDialect().sqlToQuery(d.sql).params).toContainEqual(runAt);
      } },
      { op: "select", table: bookings, rows: [fixture], check: d => scoped(d, companyId, bookingId) },
      { op: "insert", table: outbox, rows: [{ id: target.outboxId }], check: d => {
        queued = d.values;
        expect(queued).toMatchObject({ status: "pending", eventType: "whatsapp.send.requested",
          payload: { companyId, bookingId, clientId, correlationId: job.dedupeKey, meta: { source: "booking_followup" } } });
        expect(queued.payload.text).toContain("Contato sintético");
        expect(queued.dedupeKey).toBe("booking-followup-send:" + job.dedupeKey);
      } },
      { op: "update", table: automationJobs, check: d => expect(d.set).toMatchObject({ status: "done", outboxId: target.outboxId, completedAt: runAt }) },
      { op: "select", table: automationJobs, rows: [target], check: d => scoped(d, companyId, clientId, "done", "COMPLETED") },
      { op: "select", table: bookingFeedbacks, rows: [], check: d => scoped(d, companyId, bookingId) },
      { op: "insert", table: bookingFeedbacks, rows: [{ id: "synthetic-feedback" }], check: d =>
        expect(d.values).toMatchObject({ companyId, bookingId, clientId, score, source: "whatsapp" }) },
      { op: "insert", table: bookingEvents, check: d => expect(d.values).toMatchObject({
        companyId, bookingId, outboxId: target.outboxId, type: "automation.booking_followup.responded",
        payload: { score, followupJobId: target.jobId } }) },
      { op: "select", table: bookingRecoveryCases, rows: [], check: d => scoped(d, companyId, bookingId) },
      { op: "insert", table: bookingRecoveryCases, rows: [{ id: "synthetic-recovery" }], check: d =>
        expect(d.values).toMatchObject({ companyId, bookingId, clientId, feedbackId: "synthetic-feedback", score, priority, status: "open" }) },
      { op: "insert", table: bookingEvents, check: d => expect(d.values).toMatchObject({
        companyId, bookingId, type: "automation.booking_recovery.opened", payload: { recoveryCaseId: "synthetic-recovery", score, priority } }) },
    ]);
    expect(await BookingOperationalLifecycleService.apply({ companyId, bookingId, action: "complete" }))
      .toMatchObject({ ok: true, status: "COMPLETED" });
    expect(mocks.cancel).toHaveBeenCalledWith(expect.objectContaining({ companyId, bookingId }));
    vi.setSystemTime(runAt);
    // Worker "sent" is its legacy summary name for enqueueing, not Meta delivery.
    expect(await BookingFollowupWorkerService.run({ workerId: "isolated-test", now: runAt }))
      .toEqual({ ok: true, claimed: 1, sent: 1, retried: 0, cancelled: 0 });
    expect(await BookingFollowupFeedbackService.handle({ companyId, clientId, text: String(score), now: runAt }))
      .toMatchObject({ handled: true, applied: true, needsRecovery: true, bookingId, score });
    expect(queued.status).toBe("pending");
    expect(fetch).not.toHaveBeenCalled();
    harness.done();
  });

  it("does not plan when follow-up is disabled", async () => {
    const h = scriptedDb([{ op: "select", table: bookings, rows: [{ ...fixture, enabled: false }] }]);
    expect(await BookingFollowupPlannerService.plan({ companyId, bookingId }))
      .toMatchObject({ scheduled: false, reason: "automation_disabled" });
    h.done();
  });
  it("does not complete a booking from an invalid state", async () => {
    const h = scriptedDb([{ op: "select", table: bookings, rows: [{ id: bookingId, clientId, status: "PENDING" }] }]);
    expect(await BookingOperationalLifecycleService.apply({ companyId, bookingId, action: "complete" }))
      .toMatchObject({ ok: false, error: "invalid_state_transition" });
    expect(mocks.cancel).not.toHaveBeenCalled();
    h.done();
  });
  it("ignores scores without a correlated completed follow-up", async () => {
    const h = scriptedDb([{ op: "select", table: automationJobs, rows: [], check: d => scoped(d, companyId, clientId) }]);
    expect(await BookingFollowupFeedbackService.handle({ companyId, clientId, text: "1" })).toEqual({ handled: false });
    h.done();
  });
  it("does not repeat writes when the same score already exists", async () => {
    const h = scriptedDb([
      { op: "select", table: automationJobs, rows: [target] },
      { op: "select", table: bookingFeedbacks, rows: [{ id: "synthetic-feedback", score: 1 }] },
    ]);
    expect(await BookingFollowupFeedbackService.handle({ companyId, clientId, text: "1" }))
      .toMatchObject({ handled: true, applied: false });
    h.done();
  });
  it("rejects invalid feedback before accessing persistence", async () => {
    expect(await BookingFollowupFeedbackService.handle({ companyId, clientId, text: "0" })).toEqual({ handled: false });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
