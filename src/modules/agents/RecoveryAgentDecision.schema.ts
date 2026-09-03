import{z}from"zod";export const recoveryAgentActions=["human_contact","review_response","review_resolution","prepare_contact","claim_case"]as const;export const RecoveryAgentDecisionSchema=z.object({suggestedAction:z.enum(recoveryAgentActions),suggestedPriority:z.enum(["high","urgent"]),confidence:z.number().int().min(0).max(100),rationale:z.string().trim().min(10).max(500),signals:z.array(z.string().trim().min(1).max(80)).max(10)}).strict();export type RecoveryAgentDecision=z.infer<typeof RecoveryAgentDecisionSchema>;

export const RecoveryAgentDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestedAction", "suggestedPriority", "confidence", "rationale", "signals"],
  properties: {
    suggestedAction: { type: "string", enum: recoveryAgentActions },
    suggestedPriority: { type: "string", enum: ["high", "urgent"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    rationale: { type: "string", minLength: 10, maxLength: 500 },
    signals: { type: "array", maxItems: 10, items: { type: "string", minLength: 1, maxLength: 80 } },
  },
} as const;
