import { and, desc, eq } from "drizzle-orm";
import { recoveryAgentRetrievalExperimentEvaluations, recoveryAgentRetrievalShadowExperiments } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingRecoveryAgentOutcomesService } from "@/modules/automation/BookingRecoveryAgentOutcomes.service";
import type { RecoveryRetrievalExperimentEvaluation } from "./RecoveryRetrievalExperimentEvaluation.schema";

export class RecoveryRetrievalExperimentEvaluationService {
  static async list(input: { companyId: string }) {
    return { items: await getDb().select().from(recoveryAgentRetrievalExperimentEvaluations).where(eq(recoveryAgentRetrievalExperimentEvaluations.companyId, input.companyId)).orderBy(desc(recoveryAgentRetrievalExperimentEvaluations.evaluatedAt)).limit(100) };
  }

  static async create(input: { companyId: string; actorId: string; evaluation: RecoveryRetrievalExperimentEvaluation; now?: Date }) {
    const db = getDb(), now = input.now ?? new Date();
    const experiments = await db.select({ id: recoveryAgentRetrievalShadowExperiments.id, proposalId: recoveryAgentRetrievalShadowExperiments.proposalId, startsAt: recoveryAgentRetrievalShadowExperiments.startsAt }).from(recoveryAgentRetrievalShadowExperiments).where(and(eq(recoveryAgentRetrievalShadowExperiments.companyId, input.companyId), eq(recoveryAgentRetrievalShadowExperiments.id, input.evaluation.experimentId), eq(recoveryAgentRetrievalShadowExperiments.status, "stopped"))).limit(1);
    const experiment = experiments[0];
    if (!experiment) return { ok: false as const, error: "stopped_experiment_not_found" as const };
    const days = Math.min(365, Math.max(1, Math.ceil((now.getTime() - experiment.startsAt.getTime()) / 86400000) + 1));
    const outcomes = await BookingRecoveryAgentOutcomesService.get({ companyId: input.companyId, days, now });
    const metrics = outcomes.retrieval.experiments.experiments.find(item => item.experimentId === experiment.id);
    if (!metrics?.observations) return { ok: false as const, error: "experiment_evidence_not_found" as const };
    const evidence = { schemaVersion: "recovery_retrieval_experiment_evaluation_v1", capturedAt: now.toISOString(), period: outcomes.period, metrics };
    try {
      const saved = await db.insert(recoveryAgentRetrievalExperimentEvaluations).values({ companyId: input.companyId, experimentId: experiment.id, proposalId: experiment.proposalId, decision: input.evaluation.decision, reason: input.evaluation.reason, evidence, evaluatedBy: input.actorId, evaluatedAt: now }).returning({ id: recoveryAgentRetrievalExperimentEvaluations.id });
      return { ok: true as const, id: saved[0]!.id };
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return { ok: false as const, error: "experiment_already_evaluated" as const };
      throw error;
    }
  }
}
