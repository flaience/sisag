import { interpretStaffAgendaQuery } from "./WhatsAppStaffAgendaQuery";
import { resolveWhatsAppStaffAgendaIdentity } from "./WhatsAppStaffAgendaIdentity.service";
import { readWhatsAppStaffAgenda, type StaffAgendaReadModel } from "./WhatsAppStaffAgendaReadModel.service";

export type StaffAgendaQueryHandlerResult =
  | { handled: false }
  | { handled: true; replyText: string };

function periodLabel(model: StaffAgendaReadModel) {
  if (model.day === "tomorrow") {
    if (model.period === "morning") return "de amanhã pela manhã";
    if (model.period === "afternoon") return "de amanhã à tarde";
    if (model.period === "evening") return "de amanhã à noite";
    return "de amanhã";
  }
  if (model.period === "morning") return "da manhã";
  if (model.period === "afternoon") return "da tarde";
  if (model.period === "evening") return "da noite";
  return "de hoje";
}

export function composeStaffAgendaReply(model: StaffAgendaReadModel, role: "manager" | "professional") {
  if (model.kind === "next_appointment") {
    const appointment = model.appointments[0];
    if (!appointment) return "Você não possui próximo atendimento agendado.";
    const professional = role === "manager" ? "\n👤 " + appointment.professionalName : "";
    return "Seu próximo atendimento é:\n📅 " + appointment.timeLabel + "\nCliente: " + appointment.clientName + "\nServiço: " + appointment.serviceName + professional;
  }

  const scope = periodLabel(model);
  if (model.kind === "day_summary") {
    const count = model.totalCount ?? 0;
    if (count === 0) return "Não há atendimentos na agenda " + scope + ".";
    if (role === "professional") return "Você tem " + count + (count === 1 ? " atendimento " : " atendimentos ") + scope + ".";
    return "Há " + count + (count === 1 ? " atendimento " : " atendimentos ") + "na agenda " + scope + ".";
  }

  if (model.appointments.length === 0) {
    return "Não há atendimentos na sua agenda " + scope + ".";
  }

  const visible = model.appointments.slice(0, 10);
  const lines = visible.map((appointment, index) => {
    const professional = role === "manager" ? " — " + appointment.professionalName : "";
    return (index + 1) + ") " + appointment.timeLabel + " — " + appointment.clientName + " — " + appointment.serviceName + professional;
  });
  const remaining = Math.max(0, (model.totalCount ?? model.appointments.length) - visible.length);
  const complement = remaining > 0
    ? "\n… e mais " + remaining + (remaining === 1 ? " atendimento." : " atendimentos.")
    : "";
  return "Agenda " + scope + ":\n" + lines.join("\n") + complement;
}

export async function handleWhatsAppStaffAgendaQuery(input: {
  companyId: string;
  phone: string;
  text: string;
}): Promise<StaffAgendaQueryHandlerResult> {
  const query = interpretStaffAgendaQuery(input.text);
  if (!query) return { handled: false };

  const authorization = await resolveWhatsAppStaffAgendaIdentity({ companyId: input.companyId, phone: input.phone });
  if (!authorization.ok) return { handled: false };

  try {
    const model = await readWhatsAppStaffAgenda({ identity: authorization.identity, query });
    return { handled: true, replyText: composeStaffAgendaReply(model, authorization.identity.role) };
  } catch {
    return { handled: true, replyText: "Não consegui consultar a agenda agora. Tente novamente em alguns instantes." };
  }
}
