import { z } from "zod";

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => value || null);

export const CompanyUnitInputSchema = z.object({
  code: z.string().trim().toLowerCase().min(2).max(40).regex(/^[a-z0-9][a-z0-9_-]*$/, "Use letras, números, hífen ou sublinhado."),
  name: z.string().trim().min(2, "Informe o nome da unidade.").max(160),
  timeZone: z.string().trim().min(1).max(80).default("America/Sao_Paulo"),
  phone: optionalText(32),
  email: z.union([z.string().trim().email("Informe um e-mail válido."), z.literal(""), z.null(), z.undefined()]).transform((value) => value || null),
  postalCode: optionalText(20),
  street: optionalText(200),
  number: optionalText(30),
  complement: optionalText(120),
  district: optionalText(120),
  city: optionalText(120),
  state: optionalText(80),
  countryCode: z.string().trim().toUpperCase().length(2).default("BR"),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type CompanyUnitInput = z.infer<typeof CompanyUnitInputSchema>;
