export type WhatsAppHomologationProposalKind = "booking_confirmation" | "booking_cancellation" | "booking_rescheduling";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "").trim();

const confirmed: Record<WhatsAppHomologationProposalKind, string> = {
  booking_confirmation: "Confirmação reconhecida. Em produção, o agendamento proposto seria criado. Nenhuma alteração foi realizada.",
  booking_cancellation: "Confirmação reconhecida. Em produção, o agendamento proposto seria cancelado. Nenhuma alteração foi realizada.",
  booking_rescheduling: "Confirmação reconhecida. Em produção, o agendamento proposto seria remarcado. Nenhuma alteração foi realizada.",
};

const rejected: Record<WhatsAppHomologationProposalKind, string> = {
  booking_confirmation: "Desistência reconhecida. Em produção, o agendamento não seria criado. Nenhuma alteração foi realizada.",
  booking_cancellation: "Recusa reconhecida. Em produção, o agendamento seria mantido. Nenhuma alteração foi realizada.",
  booking_rescheduling: "Recusa reconhecida. Em produção, o horário atual seria mantido. Nenhuma alteração foi realizada.",
};

export function resolveWhatsAppHomologationPendingProposal(input: { text: string; proposalKind: WhatsAppHomologationProposalKind | null }) {
  if (!input.proposalKind) return null;
  const answer = normalize(input.text);
  if (answer === "sim") return { accepted: true as const, text: confirmed[input.proposalKind] };
  if (answer === "nao") return { accepted: false as const, text: rejected[input.proposalKind] };
  return null;
}
