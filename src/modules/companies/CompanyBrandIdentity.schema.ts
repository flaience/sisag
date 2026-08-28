import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => value || null);

const internalLogoPath = z.string().trim().max(500)
  .refine((value) => !value.startsWith("/") && !value.includes(".."), "Caminho de logotipo inválido.")
  .refine((value) => /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(value), "Caminho de logotipo inválido.");

export const CompanyBrandIdentityInputSchema = z.object({
  tradeName: optionalText(160),
  logoPath: z.union([internalLogoPath, z.literal(""), z.null(), z.undefined()])
    .transform((value) => value || null),
});

export type CompanyBrandIdentityInput = z.infer<typeof CompanyBrandIdentityInputSchema>;
