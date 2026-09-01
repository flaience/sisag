export const reminderStatusPresentation = {
  pending: { label: "Programado", tone: "bg-sky-100 text-sky-800" },
  processing: { label: "Processando", tone: "bg-amber-100 text-amber-800" },
  done: { label: "Enviado", tone: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Falhou", tone: "bg-rose-100 text-rose-800" },
  cancelled: { label: "Cancelado", tone: "bg-slate-100 text-slate-700" },
} as const;
export function presentReminderStatus(status: string) { return reminderStatusPresentation[status as keyof typeof reminderStatusPresentation] ?? { label: "Desconhecido", tone: "bg-slate-100 text-slate-700" }; }
export function safeReminderFailureReason(value?: string | null) { if (!value) return null; const known: Record<string, string> = { booking_not_found: "Agendamento não encontrado", booking_inactive: "Agendamento não está mais ativo", client_without_phone: "Cliente sem WhatsApp", booking_started: "Atendimento já iniciado" }; return known[value] ?? ((value.startsWith("Reconciliação:") || value.startsWith("Substituído")) ? value : "Falha temporária no envio"); }
