import { and, asc, eq, lt, or } from "drizzle-orm";
import { whatsappAudioProcessing } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { WhatsAppAudioSecretResolver } from "./WhatsAppAudioSecretResolver";
import { defaultWhatsAppAudioRunnerDependencies, WhatsAppAudioProcessingRunner } from "./WhatsAppAudioProcessingRunner";

type Candidate = { id: string; companyId: string; whatsappAccountId: string | null };
type SecretResult = Awaited<ReturnType<typeof WhatsAppAudioSecretResolver.resolve>>;
type RunnerResult = Awaited<ReturnType<typeof WhatsAppAudioProcessingRunner.run>>;

export type WhatsAppAudioWorkerDependencies = {
  listCandidates: (input: { now: Date; batchSize: number }) => Promise<Candidate[]>;
  resolveSecrets: (input: { companyId: string; whatsappAccountId: string }) => Promise<SecretResult>;
  runOne: (input: { companyId: string; processingId: string; metaAccessToken: string; openAIApiKey: string; openAIModel: string }) => Promise<RunnerResult>;
};

const boundedBatchSize = (value: number) => Number.isSafeInteger(value) ? Math.min(20, Math.max(1, value)) : 10;

export const defaultWhatsAppAudioWorkerDependencies = (fetcher: typeof fetch): WhatsAppAudioWorkerDependencies => ({
  listCandidates: async ({ now, batchSize }) => getDb().select({
    id: whatsappAudioProcessing.id,
    companyId: whatsappAudioProcessing.companyId,
    whatsappAccountId: whatsappAudioProcessing.whatsappAccountId,
  }).from(whatsappAudioProcessing).where(and(
    lt(whatsappAudioProcessing.attempts, 3),
    or(
      eq(whatsappAudioProcessing.status, "pending"),
      and(eq(whatsappAudioProcessing.status, "processing"), lt(whatsappAudioProcessing.leaseExpiresAt, now)),
    ),
  )).orderBy(asc(whatsappAudioProcessing.createdAt)).limit(batchSize),
  resolveSecrets: (input) => WhatsAppAudioSecretResolver.resolve(input),
  runOne: (input) => WhatsAppAudioProcessingRunner.run(input, defaultWhatsAppAudioRunnerDependencies(fetcher)),
});

export class WhatsAppAudioProcessingWorkerService {
  static async run(input: { batchSize: number; now?: Date }, dependencies: WhatsAppAudioWorkerDependencies) {
    const batchSize = boundedBatchSize(input.batchSize);
    const candidates = await dependencies.listCandidates({ now: input.now ?? new Date(), batchSize });
    const summary = { ok: true as const, scanned: candidates.length, completed: 0, retryPending: 0, terminalFailed: 0, configurationSkipped: 0 };

    for (const candidate of candidates) {
      if (!candidate.whatsappAccountId) { summary.configurationSkipped += 1; continue; }
      let secrets: SecretResult;
      try {
        secrets = await dependencies.resolveSecrets({ companyId: candidate.companyId, whatsappAccountId: candidate.whatsappAccountId });
      } catch {
        summary.configurationSkipped += 1;
        continue;
      }
      if (!secrets.ok) { summary.configurationSkipped += 1; continue; }

      let result: RunnerResult;
      try {
        result = await dependencies.runOne({
          companyId: candidate.companyId,
          processingId: candidate.id,
          metaAccessToken: secrets.secrets.metaAccessToken,
          openAIApiKey: secrets.secrets.openAIApiKey,
          openAIModel: secrets.secrets.openAIModel,
        });
      } catch {
        summary.retryPending += 1;
        continue;
      }
      if (result.ok) summary.completed += 1;
      else if ("status" in result && result.status === "failed") summary.terminalFailed += 1;
      else summary.retryPending += 1;
    }
    return summary;
  }
}
