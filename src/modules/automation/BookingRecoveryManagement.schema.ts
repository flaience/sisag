import { z } from "zod";
export const recoveryActions = ["claim", "contacted", "resolve", "dismiss"] as const;
export const BookingRecoveryActionSchema = z.object({ action: z.enum(recoveryActions), note: z.string().trim().max(1000).optional() }).superRefine((value, context) => { if ((value.action === "resolve" || value.action === "dismiss") && (!value.note || value.note.length < 3)) context.addIssue({ code: "custom", path: ["note"], message: "Informe uma observação com pelo menos 3 caracteres." }); });
export type BookingRecoveryAction = z.infer<typeof BookingRecoveryActionSchema>;
