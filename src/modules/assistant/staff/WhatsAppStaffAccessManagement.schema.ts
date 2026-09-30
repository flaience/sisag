import { z } from "zod";
const role=z.enum(["manager","professional"]);
const fields={whatsappAccountId:z.string().uuid(),phoneE164:z.string().trim().min(8).max(32),role,professionalId:z.string().uuid().nullable().optional()};
function roleShape(value:{role:"manager"|"professional";professionalId?:string|null},ctx:z.RefinementCtx){if(value.role==="manager"&&value.professionalId)ctx.addIssue({code:"custom",path:["professionalId"],message:"manager_cannot_have_professional"});if(value.role==="professional"&&!value.professionalId)ctx.addIssue({code:"custom",path:["professionalId"],message:"professional_required"})}
export const WhatsAppStaffAccessCreateSchema=z.object(fields).superRefine(roleShape);
export const WhatsAppStaffAccessUpdateSchema=z.object({id:z.string().uuid(),...fields,active:z.boolean()}).superRefine(roleShape);
export type WhatsAppStaffAccessCreate = { whatsappAccountId: string; phoneE164: string; role: "manager" | "professional"; professionalId?: string | null };
export type WhatsAppStaffAccessUpdate = WhatsAppStaffAccessCreate & { id: string; active: boolean };
