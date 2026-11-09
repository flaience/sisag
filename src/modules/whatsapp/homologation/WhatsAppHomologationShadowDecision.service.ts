import type {
  N8nAgentShadowAnswerCandidate,
  N8nAgentShadowBookingCancellationProposal,
  N8nAgentShadowBookingConfirmationProposal,
  N8nAgentShadowBookingReschedulingProposal,
  N8nAgentShadowDecisionMetadata,
  N8nAgentShadowExecutionMetadata,
  N8nAgentShadowToolObservation,
} from "@/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema";
import { mirrorN8nAgentShadowMessage, type N8nAgentShadowMirrorInput } from "@/modules/agents/n8n/N8nAgentShadowMirror.service";
import { WhatsAppHomologationEnvelopeSchema } from "./WhatsAppHomologation.schema";

type CompleteMirrorResult = {
  ok: true;
  skipped: false;
  decision: N8nAgentShadowDecisionMetadata;
  execution: N8nAgentShadowExecutionMetadata;
  toolObservation: N8nAgentShadowToolObservation;
  answerCandidate: N8nAgentShadowAnswerCandidate | null;
  bookingConfirmationProposal: N8nAgentShadowBookingConfirmationProposal | null;
  bookingCancellationProposal: N8nAgentShadowBookingCancellationProposal | null;
  bookingReschedulingProposal: N8nAgentShadowBookingReschedulingProposal | null;
};

type MirrorResult = CompleteMirrorResult | { ok: true; skipped: true; reason: string } | { ok: true; skipped: false } | { ok: false; error: string };
type Dependencies = { mirror: (input: N8nAgentShadowMirrorInput) => Promise<MirrorResult>; now: () => Date };

const defaultDependencies: Dependencies = {
  mirror: mirrorN8nAgentShadowMessage,
  now: () => new Date(),
};

export async function runWhatsAppHomologationShadowDecision(input: unknown, dependencies: Dependencies = defaultDependencies) {
  const parsed = WhatsAppHomologationEnvelopeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid_homologation_envelope" as const };

  const message = parsed.data.message;
  const result = await dependencies.mirror({
    companyId: message.companyId,
    whatsappAccountId: message.whatsappAccountId,
    senderPhoneE164: message.senderPhoneE164,
    providerMessageId: message.correlationId,
    text: message.text,
    receivedAt: dependencies.now(),
  });

  if ("error" in result) return { ok: false as const, error: result.error };
  if (result.skipped) return { ok: false as const, error: "shadow_decision_disabled" as const };
  if (!("decision" in result)) return { ok: false as const, error: "shadow_decision_incomplete" as const };

  return {
    ok: true as const,
    mode: "homologation" as const,
    externalDispatchAllowed: false as const,
    correlationId: message.correlationId,
    decision: result.decision,
    execution: result.execution,
    toolObservation: result.toolObservation,
    answerCandidate: result.answerCandidate,
    bookingConfirmationProposal: result.bookingConfirmationProposal,
    bookingCancellationProposal: result.bookingCancellationProposal,
    bookingReschedulingProposal: result.bookingReschedulingProposal,
  };
}
