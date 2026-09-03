export type RecoveryRecommendationInput = { score: number; priority: string; classification?: string | null; slaEscalated: boolean; assigned: boolean };

export function recommendRecoveryAction(input: RecoveryRecommendationInput) {
  if (input.classification === "human_request") return { suggestedAction: "human_contact", suggestedPriority: "urgent", confidence: 98, rationale: "O cliente pediu atendimento humano explicitamente." };
  if (input.classification === "negative") return { suggestedAction: "human_contact", suggestedPriority: "urgent", confidence: 95, rationale: "A resposta mantém sinal negativo e requer acolhimento humano prioritário." };
  if (input.classification === "other") return { suggestedAction: "review_response", suggestedPriority: input.slaEscalated ? "urgent" : input.priority, confidence: 72, rationale: "A resposta é ambígua e precisa de interpretação humana." };
  if (input.classification === "positive") return { suggestedAction: "review_resolution", suggestedPriority: input.priority, confidence: 88, rationale: "A resposta é positiva; a equipe deve confirmar a resolução antes de encerrar." };
  return { suggestedAction: input.assigned ? "prepare_contact" : "claim_case", suggestedPriority: input.slaEscalated || input.score === 1 ? "urgent" : "high", confidence: input.score === 1 ? 90 : 82, rationale: input.assigned ? "O caso já tem responsável e aguarda abordagem humana." : "O caso precisa de responsável antes da abordagem." };
}
