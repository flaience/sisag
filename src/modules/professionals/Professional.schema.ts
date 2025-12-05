/*src/modules/professionals/Professional.schema.ts*/

import { z } from "zod";

export const ProfessionalSchema = z.object({
  name: z.string().min(3),
  specialty: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  avgDuration: z.number().min(5).max(180).default(20),
  photoUrl: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
});

export type ProfessionalDTO = z.infer<typeof ProfessionalSchema>;
