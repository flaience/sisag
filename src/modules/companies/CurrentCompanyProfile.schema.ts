import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => value || null);

export const CurrentCompanyProfileInputSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da empresa.").max(160),
  document: optionalText(32),
  address: optionalText(500),
  phone: optionalText(32),
  email: z.union([z.string().trim().email("Informe um e-mail válido."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => value || null),
  businessType: z.string().trim().min(2).max(64).default("generic"),
});

export type CurrentCompanyProfileInput = z.infer<typeof CurrentCompanyProfileInputSchema>;
