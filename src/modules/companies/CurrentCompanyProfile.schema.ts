import { z } from "zod";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { normalizeCompanyBusinessTypeValue } from "./CompanyBusinessType";

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => value || null);

export const CurrentCompanyProfileInputSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da empresa.").max(160),
  tradeName: optionalText(160).refine((value) => value === null || value.length >= 2, "Informe ao menos 2 caracteres."),
  document: optionalText(32),
  address: optionalText(500),
  phone: optionalText(32),
  email: z.union([z.string().trim().email("Informe um e-mail válido."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => value || null),
  businessType: z.preprocess((value) => normalizeCompanyBusinessTypeValue(typeof value === "string" ? value : null), z.enum(BUSINESS_TYPES)).default("generic"),
});

export type CurrentCompanyProfileInput = z.infer<typeof CurrentCompanyProfileInputSchema>;
