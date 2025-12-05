import { z } from "zod";

export const CompanySchema = z.object({
  name: z.string().min(3),
  document: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
});

export type CompanyDTO = z.infer<typeof CompanySchema>;
