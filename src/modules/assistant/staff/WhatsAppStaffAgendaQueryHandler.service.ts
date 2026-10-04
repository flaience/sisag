import { interpretStaffAgendaQuery } from "./WhatsAppStaffAgendaQuery";
import { resolveWhatsAppStaffAgendaIdentity } from "./WhatsAppStaffAgendaIdentity.service";
import { readWhatsAppStaffAgenda, type StaffAgendaReadModel } from "./WhatsAppStaffAgendaReadModel.service";
import { resolveWhatsAppStaffAgendaProfessional } from "./WhatsAppStaffAgendaProfessionalResolver.service";

export type StaffAgendaQueryHandlerResult =
  | { handled: false }
  | { handled: true; replyText: string };

function dateLabel(dateIso?: string | null) {
  if (!dateIso) return "";
  const [year, month, day] = dateIso.split("-");
  return day + "/" + month + "/" + year;
}

function periodLabel(model: StaffAgendaReadModel) {
  if (model.day === "this_month" || model.day === "next_month" || model.day === "specific_month") {
    const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const monthIndex = Number((model.dateIso ?? "").slice(5, 7)) - 1;
    const year = (model.dateIso ?? "").slice(0, 4);
    const month = model.day === "this_month" ? "deste mês" : model.day === "next_month" ? "do próximo mês" : "de " + monthNames[monthIndex] + " de " + year;
    if (model.period === "morning") return month + " pela manhã";
    if (model.period === "afternoon") return month + " à tarde";
    if (model.period === "evening") return month + " à noite";
    return month;
  }
  if (model.day === "this_week" || model.day === "next_week") {
    const week = model.day === "this_week" ? "desta semana" : "da próxima semana";
    if (model.period === "morning") return week + " pela manhã";
    if (model.period === "afternoon") return week + " à tarde";
    if (model.period === "evening") return week + " à noite";
    return week;
  }
  if (model.day === "specific") {
    const date = dateLabel(model.dateIso);
    if (model.period === "morning") return "de " + date + " pela manhã";
    if (model.period === "afternoon") return "de " + date + " à tarde";
    if (model.period === "evening") return "de " + date + " à noite";
    return "de " + date;
  }
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
    let targetProfessionalId: string | undefined;
    if (query.professionalName) {
      const resolution = await resolveWhatsAppStaffAgendaProfessional({ companyId: input.companyId, name: query.professionalName });
      if (resolution.ok === false) {
        return { handled: true, replyText: resolution.reason === "ambiguous"
          ? "Encontrei mais de um profissional com esse nome. Informe o nome completo."
          : "Não encontrei um profissional ativo com esse nome." };
      }
      if (authorization.identity.role === "professional" && authorization.identity.professionalId !== resolution.professional.id) {
        return { handled: true, replyText: "Este acesso permite consultar somente a sua própria agenda." };
      }
      targetProfessionalId = resolution.professional.id;
    }
    const model = await readWhatsAppStaffAgenda({ identity: authorization.identity, query, targetProfessionalId });
    return { handled: true, replyText: composeStaffAgendaReply(model, authorization.identity.role) };
  } catch {
    return { handled: true, replyText: "Não consegui consultar a agenda agora. Tente novamente em alguns instantes." };
  }
}
