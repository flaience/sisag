import { z } from "zod";

const checkCodeSchema = z.enum([
  "company_configuration",
  "scheduling_configuration",
  "team_configuration",
  "active_channels",
  "training_completion",
  "operational_health",
]);

const actorSchema = z.object({
  type: z.enum(["human", "agent", "system", "n8n"]),
  id: z.string().trim().min(1).max(200),
});

export const commercialOnboardingGoLiveEvidenceSchema = z.object({
  checkCode: checkCodeSchema,
  status: z.enum(["passed", "failed"]),
  checkedAt: z.string().datetime(),
  checkedBy: actorSchema,
  details: z.string().trim().min(3).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CommercialOnboardingGoLiveEvidence = z.input<
  typeof commercialOnboardingGoLiveEvidenceSchema
>;

export type CommercialOnboardingGoLiveCheck = {
  code: z.output<typeof checkCodeSchema>;
  title: string;
  required: true;
};

export type CommercialOnboardingGoLiveChecklist = {
  version: "2026-08-v1";
  checks: CommercialOnboardingGoLiveCheck[];
};

const checks: CommercialOnboardingGoLiveCheck[] = [
  { code: "company_configuration", title: "Configuração da empresa", required: true },
  { code: "scheduling_configuration", title: "Configuração da agenda", required: true },
  { code: "team_configuration", title: "Configuração da equipe", required: true },
  { code: "active_channels", title: "Canais de atendimento ativos", required: true },
  { code: "training_completion", title: "Treinamento concluído", required: true },
  { code: "operational_health", title: "Saúde operacional", required: true },
];

export function buildCommercialOnboardingGoLiveChecklist(): CommercialOnboardingGoLiveChecklist {
  return {
    version: "2026-08-v1",
    checks: checks.map((check) => ({ ...check })),
  };
}

export function evaluateCommercialOnboardingGoLive(
  checklist: CommercialOnboardingGoLiveChecklist,
  rawEvidence: CommercialOnboardingGoLiveEvidence[],
) {
  const parsed = z.array(commercialOnboardingGoLiveEvidenceSchema).max(100).safeParse(rawEvidence);
  if (!parsed.success) {
    return {
      ready: false as const,
      error: "invalid_evidence" as const,
      missingChecks: checklist.checks.map((check) => check.code),
      failedChecks: [],
    };
  }

  const latestByCheck = new Map<
    z.output<typeof checkCodeSchema>,
    z.output<typeof commercialOnboardingGoLiveEvidenceSchema>
  >();
  for (const evidence of parsed.data) {
    const current = latestByCheck.get(evidence.checkCode);
    if (!current || evidence.checkedAt > current.checkedAt) {
      latestByCheck.set(evidence.checkCode, evidence);
    }
  }

  const missingChecks = checklist.checks
    .filter((check) => !latestByCheck.has(check.code))
    .map((check) => check.code);
  const failedChecks = checklist.checks
    .filter((check) => latestByCheck.get(check.code)?.status === "failed")
    .map((check) => check.code);

  if (missingChecks.length > 0 || failedChecks.length > 0) {
    return {
      ready: false as const,
      error: "go_live_not_ready" as const,
      missingChecks,
      failedChecks,
    };
  }

  const evidence = checklist.checks.map((check) => latestByCheck.get(check.code)!);
  return {
    ready: true as const,
    result: {
      checklistVersion: checklist.version,
      passedChecks: checklist.checks.map((check) => check.code),
      evidence,
      validatedAt: evidence.map((item) => item.checkedAt).sort().at(-1)!,
    },
  };
}

