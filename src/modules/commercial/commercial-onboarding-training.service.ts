import { z } from "zod";

const moduleCodeSchema = z.enum([
  "platform_basics",
  "scheduling_operations",
  "team_operations",
  "channels_and_support",
]);

export const commercialOnboardingTrainingContextSchema = z.object({
  businessType: z.string().trim().min(1).max(100).default("generic"),
  activeChannels: z.array(z.string().trim().min(1).max(32)).max(20).default([]),
  teamSize: z.number().int().positive().max(1000).default(1),
});

export const commercialOnboardingTrainingEvidenceSchema = z.object({
  moduleCode: moduleCodeSchema,
  completedBy: z.object({
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(2).max(120),
  }),
  completedAt: z.string().datetime(),
  score: z.number().min(0).max(100),
  acknowledged: z.literal(true),
  evidence: z.string().trim().min(3).max(500),
});

export type CommercialOnboardingTrainingContext = z.input<
  typeof commercialOnboardingTrainingContextSchema
>;
export type CommercialOnboardingTrainingEvidence = z.input<
  typeof commercialOnboardingTrainingEvidenceSchema
>;

export type CommercialOnboardingTrainingModule = {
  code: z.output<typeof moduleCodeSchema>;
  title: string;
  objective: string;
  required: true;
  minimumScore: number;
  estimatedMinutes: number;
};

export type CommercialOnboardingTrainingPlan = {
  version: "2026-08-v1";
  context: z.output<typeof commercialOnboardingTrainingContextSchema>;
  modules: CommercialOnboardingTrainingModule[];
  totalEstimatedMinutes: number;
};

const modules: CommercialOnboardingTrainingModule[] = [
  {
    code: "platform_basics",
    title: "Fundamentos do SISAG",
    objective: "Navegar com segurança e compreender os papéis de acesso.",
    required: true,
    minimumScore: 70,
    estimatedMinutes: 15,
  },
  {
    code: "scheduling_operations",
    title: "Operação da agenda",
    objective: "Criar, alterar e cancelar agendamentos sem conflitos.",
    required: true,
    minimumScore: 80,
    estimatedMinutes: 25,
  },
  {
    code: "team_operations",
    title: "Rotina da equipe",
    objective: "Aplicar responsabilidades, disponibilidade e atendimento.",
    required: true,
    minimumScore: 70,
    estimatedMinutes: 20,
  },
  {
    code: "channels_and_support",
    title: "Canais e suporte assistido",
    objective: "Validar canais ativos e acionar suporte com contexto.",
    required: true,
    minimumScore: 70,
    estimatedMinutes: 15,
  },
];

export function buildCommercialOnboardingTrainingPlan(
  rawContext: CommercialOnboardingTrainingContext,
): CommercialOnboardingTrainingPlan | null {
  const parsed = commercialOnboardingTrainingContextSchema.safeParse(rawContext);
  if (!parsed.success) return null;

  const context = {
    ...parsed.data,
    activeChannels: [...new Set(parsed.data.activeChannels.map((value) => value.toLowerCase()))],
  };
  return {
    version: "2026-08-v1",
    context,
    modules: modules.map((module) => ({ ...module })),
    totalEstimatedMinutes: modules.reduce(
      (total, module) => total + module.estimatedMinutes,
      0,
    ),
  };
}

export function evaluateCommercialOnboardingTraining(
  plan: CommercialOnboardingTrainingPlan,
  rawEvidence: CommercialOnboardingTrainingEvidence[],
) {
  const parsed = z.array(commercialOnboardingTrainingEvidenceSchema).max(100).safeParse(rawEvidence);
  if (!parsed.success) {
    return { ready: false as const, error: "invalid_evidence", missingModules: plan.modules.map((m) => m.code) };
  }

  const evidenceByModule = new Map(parsed.data.map((item) => [item.moduleCode, item]));
  const missingModules = plan.modules
    .filter((module) => {
      const evidence = evidenceByModule.get(module.code);
      return !evidence || evidence.score < module.minimumScore;
    })
    .map((module) => module.code);

  if (missingModules.length > 0) {
    return { ready: false as const, error: "training_incomplete", missingModules };
  }

  return {
    ready: true as const,
    result: {
      planVersion: plan.version,
      completedModules: plan.modules.map((module) => module.code),
      evidence: parsed.data,
      completedAt: parsed.data
        .map((item) => item.completedAt)
        .sort()
        .at(-1)!,
    },
  };
}
