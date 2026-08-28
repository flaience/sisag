import { z } from "zod";
export type ProfessionalUnitLinkInput = { unitId: string; isPrimary: boolean };
export const ProfessionalUnitLinkSchema = z.object({
  unitId: z.string().uuid("Local de atendimento inválido."),
  isPrimary: z.boolean().optional(),
}).transform((value): ProfessionalUnitLinkInput => ({ unitId: value.unitId, isPrimary: value.isPrimary ?? false }));
