import { z } from "zod";
export type ServicePricingMode = "fixed" | "free" | "on_request";
export type ServiceCatalogInput = { name: string; description: string | null; durationMinutes: number; pricingMode: ServicePricingMode; price: string | null; active: boolean };
export const ServiceCatalogSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço.").max(160),
  description: z.union([z.string().trim().max(500), z.literal(""), z.null(), z.undefined()]),
  durationMinutes: z.coerce.number().int().min(5).max(1440),
  pricingMode: z.enum(["fixed", "free", "on_request"]).default("fixed"),
  price: z.union([z.coerce.number().min(0).max(99999999.99), z.literal(""), z.null(), z.undefined()]),
  active: z.boolean().optional(),
}).superRefine((value, context) => { if (value.pricingMode === "fixed" && (typeof value.price !== "number" || value.price <= 0)) context.addIssue({ code: "custom", path: ["price"], message: "Informe um preço maior que zero." }); }).transform((value): ServiceCatalogInput => ({ name: value.name, description: value.description || null, durationMinutes: value.durationMinutes, pricingMode: value.pricingMode, price: value.pricingMode === "fixed" ? Number(value.price).toFixed(2) : value.pricingMode === "free" ? "0.00" : null, active: value.active ?? true }));
