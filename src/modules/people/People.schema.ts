import { z } from "zod";

export const PersonSchema = z.object({
  name: z.string().min(3),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  companyId: z.string().uuid().optional().nullable(),
});

export type PersonDTO = z.infer<typeof PersonSchema>;
