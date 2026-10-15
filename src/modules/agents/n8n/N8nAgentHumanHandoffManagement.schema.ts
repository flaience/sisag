import { z } from "zod";

export const N8nAgentHumanHandoffActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["claim", "resolve", "dismiss"]),
}).strict();

export type N8nAgentHumanHandoffAction = z.infer<typeof N8nAgentHumanHandoffActionSchema>;