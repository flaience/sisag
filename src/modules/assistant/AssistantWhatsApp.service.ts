// src/modules/assistant/AssistantWhatsApp.service.ts

import { AppointmentService } from "@/modules/appointments/Appointment.service";
import { ClientRepository } from "@/modules/clients/Client.repository";
import { ProfessionalRepository } from "@/modules/professionals/Professional.repository";

type Inbound = { phone: string; text: string };

function normalizeToE164BR(phoneRaw: string) {
  // MVP: normaliza para só dígitos, e tenta gerar 55 + DDD + número
  const digits = phoneRaw.replace(/\D/g, "");

  // já veio com 55?
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;

  // se veio com DDD + número (10/11 dígitos)
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;

  // fallback
  return `+${digits}`;
}

function parseDateTimeBR(text: string): Date | null {
  // MVP bem simples e estável (sem IA):
  // aceita: "28/01 10:30", "28/01 às 10", "amanhã 10:00", "hoje 09:15"
  const t = text.toLowerCase();

  const now = new Date();

  // hoje / amanhã
  let baseDate = new Date(now);
  if (t.includes("amanhã") || t.includes("amanha")) {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (t.includes("hoje")) {
    // mantém
  } else {
    // dd/mm
    const m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = m[3]
        ? Number(m[3].length === 2 ? `20${m[3]}` : m[3])
        : now.getFullYear();
      baseDate = new Date(yyyy, mm - 1, dd);
    }
  }

  // hora
  const hm = t.match(/(\d{1,2})(?::(\d{2}))?\s*h?/);
  if (!hm) return null;

  const hh = Number(hm[1]);
  const min = hm[2] ? Number(hm[2]) : 0;

  const dt = new Date(baseDate);
  dt.setHours(hh, min, 0, 0);

  // Importantíssimo: seu agendamento usa ISO; dt aqui é local do servidor.
  // MVP: retornamos dt como Date e convertimos para ISO depois.
  return dt;
}

export class AssistantWhatsAppService {
  static async handleInbound({ phone, text }: Inbound) {
    const phoneE164 = normalizeToE164BR(phone);

    // 1) garantir cliente (cria se não existir)
    let client = await ClientRepository.findByPhone(phoneE164);
    if (!client) {
      client = await ClientRepository.createMinimal({
        name: "Novo Cliente (WhatsApp)",
        phone: phoneE164,
      });
    }

    // 2) escolher profissional (MVP: primeiro ACTIVE)
    const professional = await ProfessionalRepository.findFirstActive();
    if (!professional?.id) {
      return {
        ok: true,
        replyText:
          "No momento não há profissionais disponíveis para agendamento. Por favor, tente novamente mais tarde.",
      };
    }

    // 3) entender intenção (MVP: só “agendar”)
    const dt = parseDateTimeBR(text);
    if (!dt) {
      return {
        ok: true,
        replyText:
          "Me diga o dia e horário para agendar. Ex: “28/01 10:30” ou “amanhã 9h”.",
      };
    }

    // 4) chamar o core do SISAG (regras + criação + outbox)
    const result = await AppointmentService.create({
      professionalId: professional.id,
      clientId: client.id,
      scheduledTime: dt.toISOString(),
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        message: result.message,
      };
    }
    const appointment = result.appointment;

    return {
      ok: true,
      replyText: `Agendamento confirmado ✅\n\nProfissional: ${professional.name}\nData/hora: ${dt.toLocaleString("pt-BR")}`,
      appointmentId: appointment.id,
      clientId: client.id,
      professionalId: professional.id,
    };
  }
}
