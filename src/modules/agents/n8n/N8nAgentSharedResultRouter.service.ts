import { createN8nAgentDirectClarificationCandidate } from "./N8nAgentDirectClarification";
import { isN8nAgentAnswerCandidateRoutingEnabled, routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";
import { isN8nAgentBookingCancellationProposalRoutingEnabled, routeN8nAgentBookingCancellationProposal } from "./N8nAgentBookingCancellationProposalRouting.service";
import { isN8nAgentBookingProposalRoutingEnabled, routeN8nAgentBookingProposal } from "./N8nAgentBookingProposalRouting.service";
import { isN8nAgentBookingReschedulingProposalRoutingEnabled, routeN8nAgentBookingReschedulingProposal } from "./N8nAgentBookingReschedulingProposalRouting.service";
import { isN8nAgentHumanHandoffRoutingEnabled, routeN8nAgentHumanHandoff } from "./N8nAgentHumanHandoffRouting.service";
import type { mirrorN8nAgentShadowMessage } from "./N8nAgentShadowMirror.service";

type MirrorResult = Awaited<ReturnType<typeof mirrorN8nAgentShadowMessage>>;
type Input = { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; result: MirrorResult };
type Dependencies = {
  answerEnabled: typeof isN8nAgentAnswerCandidateRoutingEnabled;
  handoffEnabled: typeof isN8nAgentHumanHandoffRoutingEnabled;
  cancellationEnabled: typeof isN8nAgentBookingCancellationProposalRoutingEnabled;
  reschedulingEnabled: typeof isN8nAgentBookingReschedulingProposalRoutingEnabled;
  bookingEnabled: typeof isN8nAgentBookingProposalRoutingEnabled;
  routeAnswer: typeof routeN8nAgentAnswerCandidate;
  routeHandoff: typeof routeN8nAgentHumanHandoff;
  routeCancellation: typeof routeN8nAgentBookingCancellationProposal;
  routeRescheduling: typeof routeN8nAgentBookingReschedulingProposal;
  routeBooking: typeof routeN8nAgentBookingProposal;
};

const defaults: Dependencies = {
  answerEnabled: isN8nAgentAnswerCandidateRoutingEnabled,
  handoffEnabled: isN8nAgentHumanHandoffRoutingEnabled,
  cancellationEnabled: isN8nAgentBookingCancellationProposalRoutingEnabled,
  reschedulingEnabled: isN8nAgentBookingReschedulingProposalRoutingEnabled,
  bookingEnabled: isN8nAgentBookingProposalRoutingEnabled,
  routeAnswer: routeN8nAgentAnswerCandidate,
  routeHandoff: routeN8nAgentHumanHandoff,
  routeCancellation: routeN8nAgentBookingCancellationProposal,
  routeRescheduling: routeN8nAgentBookingReschedulingProposal,
  routeBooking: routeN8nAgentBookingProposal,
};

export function isN8nAgentSharedResultRoutingEnabled(dependencies: Dependencies = defaults) {
  return dependencies.answerEnabled() || dependencies.handoffEnabled() || dependencies.cancellationEnabled() || dependencies.reschedulingEnabled();
}

export async function routeN8nAgentSharedResult(input: Input, dependencies: Dependencies = defaults) {
  const result = input.result;
  const decision = "decision" in result ? result.decision : null;
  const toolObservation = "toolObservation" in result ? result.toolObservation : null;
  let handled = false;

  if (dependencies.handoffEnabled()) handled = (await dependencies.routeHandoff({ ...input, decision })).handled;

  const cancellation = "bookingCancellationProposal" in result ? result.bookingCancellationProposal : null;
  if (!handled && cancellation && dependencies.cancellationEnabled()) handled = (await dependencies.routeCancellation({ ...input, decision, toolObservation, proposal: cancellation })).handled;

  const rescheduling = "bookingReschedulingProposal" in result ? result.bookingReschedulingProposal : null;
  if (!handled && rescheduling && dependencies.reschedulingEnabled()) handled = (await dependencies.routeRescheduling({ ...input, decision, toolObservation, proposal: rescheduling })).handled;

  if (!handled && dependencies.answerEnabled()) {
    const booking = "bookingConfirmationProposal" in result ? result.bookingConfirmationProposal : null;
    if (booking && dependencies.bookingEnabled()) handled = (await dependencies.routeBooking({ ...input, decision, toolObservation, proposal: booking })).handled;
    if (!handled) {
      const answerCandidate = booking || cancellation || rescheduling ? null : (("answerCandidate" in result ? result.answerCandidate : null) ?? createN8nAgentDirectClarificationCandidate({ decision, toolObservation }));
      handled = (await dependencies.routeAnswer({ companyId: input.companyId, toPhone: input.toPhone, correlationId: input.correlationId, decision, toolObservation, answerCandidate })).handled;
    }
  }

  return { handled };
}
