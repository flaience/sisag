import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { bookingEvents, bookingRecoveryCases, bookingRecoveryRecommendations, recoveryAgentKnowledgeDocuments } from "@/drizzle/schema";
import { BookingFeedbackRecoveryService } from "./BookingFeedbackRecovery.service";
import { BookingRecoveryRecommendationService } from "./BookingRecoveryRecommendation.service";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

// Persistence responses are scripted. This is NOT a SQL/RLS/transaction test.
// Domain rules, context retrieval, runtime and output validation are real.
type Step = { op: "select" | "insert"; table: unknown; rows?: any[] | (() => any[]); check?: (data: any) => void };
function database(steps: Step[]) {
  const remaining = [...steps];
  const writes: any[] = [];
  const errors: unknown[] = [];
  const begin = (op: string, table?: unknown) => {
    const step = remaining.shift();
    expect(step?.op).toBe(op);
    const data: any = { table };
    let completed = false;
    let result: any[];
    const finish = () => {
      if (!completed) {
        completed = true;
        try {
          expect(data.table).toBe(step!.table);
          step!.check?.(data);
          result = typeof step!.rows === "function" ? step!.rows() : step!.rows ?? [];
          if (op === "insert") writes.push(data);
        } catch (error) { errors.push(error); throw error; }
      }
      return result;
    };
    const chain: any = {
      from(value: unknown) { data.table = value; return chain; },
      innerJoin() { return chain; }, leftJoin() { return chain; }, orderBy() { return chain; },
      where(value: unknown) { data.where = value; return chain; },
      values(value: unknown) { data.values = value; return chain; },
      onConflictDoUpdate(value: unknown) { data.conflict = value; return chain; },
      limit() { return Promise.resolve(finish()); }, returning() { return Promise.resolve(finish()); },
      then(resolve: any, reject: any) { return Promise.resolve().then(finish).then(resolve, reject); },
    };
    return chain;
  };
  const db: any = {
    select: () => begin("select"), insert: (table: unknown) => begin("insert", table),
    transaction: async (callback: any) => callback(db),
  };
  mocks.getDb.mockReturnValue(db);
  return { db, writes, done() { expect(remaining).toHaveLength(0); expect(errors).toHaveLength(0); } };
}
const companyId = "00000000-0000-4000-8000-000000000001";
const otherCompany = "00000000-0000-4000-8000-000000000009";
const bookingId = "00000000-0000-4000-8000-000000000002";
const clientId = "00000000-0000-4000-8000-000000000003";
const actorId = "00000000-0000-4000-8000-000000000004";
const caseId = "00000000-0000-4000-8000-000000000005";
const now = new Date("2026-09-11T12:00:00Z");
const current = { caseId, bookingId, clientId, score: 1, priority: "urgent", assignedTo: null,
  caseCreatedAt: now, classification: null, slaEscalatedAt: null, responseId: null, responseCreatedAt: null,
  recordCompanyId: companyId, bookingStatus: "COMPLETED", bookingStartTime: now, bookingSource: "admin" };
const decision = { suggestedAction: "human_contact", suggestedPriority: "urgent", confidence: 95,
  rationale: "Solicitar avaliação humana do caso de recuperação.", signals: ["synthetic_low_score"] };
const document = { id: "synthetic-document", companyId, sourceType: "manual", sourceRef: "test-only",
  title: "urgent", content: "Encaminhar o caso urgent para revisão humana.", contentHash: "synthetic-hash",
  version: 1, status: "approved", validFrom: now, validUntil: null };
function scoped(data: any, ...values: string[]) {
  const params = new PgDialect().sqlToQuery(data.where).params;
  for (const value of values) expect(params).toContain(value);
}
function generationSteps(record = current, documents: any[] = []): Step[] {
  return [
    { op: "select", table: bookingRecoveryCases, rows: [record], check: d => scoped(d, companyId, caseId, "open", "contacted") },
    { op: "select", table: recoveryAgentKnowledgeDocuments, rows: documents, check: d => scoped(d, companyId, "approved", "recovery") },
    { op: "insert", table: bookingRecoveryRecommendations, rows: drows, check: d => {
      expect(d.values).toMatchObject({ companyId, recoveryCaseId: caseId, bookingId, clientId,
        status: "shadow", engine: "recovery_rules_v1", suggestedAction: "claim_case" });
      expect(d.conflict.set).toMatchObject({ status: "shadow", engine: "recovery_rules_v1" });
      expect(d.conflict.set.agentDecision).toEqual(d.values.agentDecision);
    } },
    { op: "insert", table: bookingEvents, check: d => expect(d.values).toMatchObject({
      companyId, bookingId, clientId, actor: "admin", type: "automation.booking_recovery.recommendation_created",
      payload: { recoveryCaseId: caseId, recommendationId: "synthetic-recommendation", version: 1, mode: "shadow", actorId } }) },
  ];
}
function drows() { return [{ id: "synthetic-recommendation", version: 1, status: "shadow" }]; }
function saved(h: ReturnType<typeof database>) { return h.writes.find(d => d.table === bookingRecoveryRecommendations).values; }
beforeEach(() => {
  mocks.getDb.mockReset();
  vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External network forbidden"); }));
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals(); vi.useRealTimers();
});

describe("isolated recovery to recommendation (no external action)", () => {
  it("uses the case opened by recovery and persists an AI shadow decision separately from rules", async () => {
    let opened: any;
    const provider = { complete: vi.fn().mockResolvedValue({ output: decision, model: "synthetic-model", inputTokens: 12, outputTokens: 8 }) };
    const steps = generationSteps();
    steps[0].rows = () => [{ ...current, ...opened, caseId }];
    const h = database([
      { op: "select", table: bookingRecoveryCases, rows: [], check: d => scoped(d, companyId, bookingId) },
      { op: "insert", table: bookingRecoveryCases, rows: [{ id: caseId }], check: d => {
        opened = d.values;
        expect(opened).toMatchObject({ companyId, bookingId, clientId, score: 1, priority: "urgent", status: "open" });
      } },
      { op: "insert", table: bookingEvents, check: d => expect(d.values.type).toBe("automation.booking_recovery.opened") },
      ...steps,
    ]);
    const recovery = await BookingFeedbackRecoveryService.sync(h.db, { companyId, bookingId, clientId,
      feedbackId: "synthetic-feedback", score: 1, actor: "whatsapp", now });
    expect(recovery).toMatchObject({ action: "opened", recoveryCaseId: caseId });
    const result = await BookingRecoveryRecommendationService.generate({ companyId, caseId: recovery.recoveryCaseId!, actorId,
      agent: { provider, providerName: "synthetic" } });
    expect(result).toMatchObject({ ok: true, recommendation: { status: "shadow" } });
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(provider.complete.mock.calls[0][0].input.retrievedContext.recovery).toMatchObject({ score: 1, priority: "urgent" });
    expect(saved(h)).toMatchObject({ suggestedAction: "claim_case", agentDecision: decision,
      agentExecution: { mode: "ai", model: "synthetic-model", inputTokens: 12, outputTokens: 8, errorCode: null } });
    expect(h.writes.at(-1).values.payload.agentDecision).toEqual(decision);
    h.done();
  });

  it.each(["absent", "error", "invalid"] as const)("persists deterministic fallback for provider %s", async kind => {
    const provider = kind === "absent" ? undefined : { complete: vi.fn(async () => {
      if (kind === "error") throw new Error("synthetic-provider-failure");
      return { model: "synthetic-model", output: { ...decision, suggestedAction: "send_whatsapp" } };
    }) };
    const h = database(generationSteps());
    await BookingRecoveryRecommendationService.generate({ companyId, caseId, actorId, agent: { provider } });
    const code = { absent: "provider_not_configured", error: "provider_error", invalid: "invalid_structured_output" }[kind];
    expect(saved(h)).toMatchObject({ status: "shadow", agentDecision: { suggestedAction: "claim_case" },
      agentExecution: { mode: "fallback", errorCode: code } });
    h.done();
  });

  it("blocks provider invocation when retrieved record belongs to another company", async () => {
    const provider = { complete: vi.fn() };
    const h = database(generationSteps({ ...current, recordCompanyId: otherCompany }));
    await BookingRecoveryRecommendationService.generate({ companyId, caseId, actorId, agent: { provider } });
    expect(provider.complete).not.toHaveBeenCalled();
    expect(saved(h).agentExecution).toMatchObject({ mode: "fallback", errorCode: "context_unavailable",
      context: { errorCode: "context_tenant_mismatch" } });
    h.done();
  });

  it("does not call a provider or persist a recommendation without an active case", async () => {
    const provider = { complete: vi.fn() };
    const h = database([{ op: "select", table: bookingRecoveryCases, rows: [], check: d => scoped(d, companyId, caseId) }]);
    expect(await BookingRecoveryRecommendationService.generate({ companyId, caseId, actorId, agent: { provider } }))
      .toEqual({ ok: false, error: "active_recovery_case_not_found" });
    expect(provider.complete).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
    h.done();
  });

  it("provides only eligible lexical knowledge to the simulated agent", async () => {
    const provider = { complete: vi.fn().mockResolvedValue({ output: decision, model: "synthetic-model" }) };
    const h = database(generationSteps(current, [
      document, { ...document, id: "foreign", companyId: otherCompany },
      { ...document, id: "draft", status: "draft" },
      { ...document, id: "expired", validUntil: new Date(now.getTime() - 1) },
    ]));
    await BookingRecoveryRecommendationService.generate({ companyId, caseId, actorId, agent: { provider } });
    const knowledge = provider.complete.mock.calls[0][0].input.retrievedContext.knowledge;
    expect(knowledge.map((d: any) => d.documentId)).toEqual([document.id]);
    expect(saved(h).agentExecution.context.sources).toContain("knowledge_documents");
    h.done();
  });
});
