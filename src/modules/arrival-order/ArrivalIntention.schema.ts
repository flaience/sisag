import { z } from "zod";

export const ArrivalIntentionInputSchema = z.object({
  periodId: z.string().uuid(),
  clientId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(["admin", "whatsapp", "n8n", "system"]),
  requestId: z.string().trim().min(1).max(200),
});

export type ArrivalIntentionInput = {
  periodId: string;
  clientId: string;
  attendanceDate: string;
  source: "admin" | "whatsapp" | "n8n" | "system";
  requestId: string;
};
