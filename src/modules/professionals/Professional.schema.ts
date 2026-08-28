import { z } from "zod";

export type ProfessionalDTO = {
  name: string;
  specialty: string | null;
  status: "ACTIVE" | "INACTIVE";
  avgDuration: number;
};

export const ProfessionalSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do profissional.").max(160),
  specialty: z.union([z.string().trim().max(160), z.literal(""), z.null(), z.undefined()]),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  avgDuration: z.coerce.number().int().min(5).max(480).optional(),
}).transform((value): ProfessionalDTO => ({
  name: value.name,
  specialty: value.specialty || null,
  status: value.status ?? "ACTIVE",
  avgDuration: value.avgDuration ?? 20,
}));
