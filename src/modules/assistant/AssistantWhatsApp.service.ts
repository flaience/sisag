import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { interpretMessage } from "./whatsapp-core/interpreter/interpretMessage";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { ClientResolverService } from "@/modules/clients/ClientResolver.service";
import { ConversationSessionService } from "./whatsapp-core/sessions/ConversationSession.service";
import { MessageComposer } from "./whatsapp-core/composer/MessageComposer";

import { getDb } from "@/lib/db";
import { professionals } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

import { AppointmentService } from "@/modules/appointments/Appointment.service";

export class AssistantWhatsAppService {
  static async handleInbound(input: {
    companyId: string;
    phone: string;
    text: string;
    correlationId?: string | null;
    fromName?: string | null;
  }) {
    const companyId = input.companyId;
    const fromPhoneE164 = normalizePhoneE164(input.phone);
    const text = (input.text || "").trim();

    const clientResolver = new ClientResolverService();
    const client = await clientResolver.resolveOrCreate({
      companyId,
      phoneE164: fromPhoneE164,
      name: input.fromName ?? null,
    });

    const sessions = new ConversationSessionService();
    const composer = new MessageComposer();

    const openSession = await sessions.getOpen(companyId, client.id);

    const interpreted = interpretMessage(text, new Date());

    // Merge slots com sessão aberta (se existir)
    const pending = (openSession?.context?.pending ?? {}) as any;
    const mergedDateIso = interpreted.slots.dateIso ?? pending.dateIso;
    const mergedTime = interpreted.slots.time ?? pending.time;

    let replyText = "";

    if (interpreted.intent === "HELP") {
      replyText = composer.help();
    } else if (interpreted.intent === "CANCEL_REQUEST") {
      replyText = composer.cancelAck();
      // (MVP: aqui depois você implementa localizar próximo appointment e cancelar)
    } else {
      // tratar agendamento (ou continuação de sessão)
      const wantsSchedule =
        interpreted.intent === "SCHEDULE_REQUEST" ||
        openSession?.context?.pendingIntent === "SCHEDULE_REQUEST";

      if (!wantsSchedule) {
        replyText = composer.unknown();
      } else {
        if (!mergedDateIso || !mergedTime) {
          await sessions.openOrUpdate(companyId, client.id, {
            pendingIntent: "SCHEDULE_REQUEST",
            pending: { dateIso: mergedDateIso, time: mergedTime },
          });

          replyText = composer.askMissingDateTime();
        } else {
          // ✅ tem date+time: criar appointment
          const scheduledIso = `${mergedDateIso}T${mergedTime}:00.000Z`;

          const professionalId = await pickDefaultProfessional(companyId);
          if (!professionalId) {
            replyText =
              "Não encontrei nenhum profissional ativo para agendar. Fale com o administrador.";
          } else {
            const result = await AppointmentService.create({
              professionalId,
              clientId: client.id,
              scheduledTime: scheduledIso,
            });

            if (!result.ok) {
              replyText = `Não consegui agendar: ${result.message}`;
            } else {
              // fecha sessão
              if (openSession) await sessions.close(openSession.id);
              replyText = "✅ Agendamento criado! Vou confirmar e te aviso.";
            }
          }
        }
      }
    }

    await OutboxPublisher.publish({
      aggregateType: "whatsapp_message",
      aggregateId: crypto.randomUUID(),
      eventType: "whatsapp.send.requested",
      payload: {
        companyId,
        toPhone: fromPhoneE164,
        text: replyText,
        clientId: client.id,
        correlationId: input.correlationId ?? null,
        meta: { source: "api", emittedAt: new Date().toISOString() },
      },
      status: "pending",
    });

    return { ok: true };
  }
}

async function pickDefaultProfessional(
  companyId: string,
): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(eq(professionals.companyId, companyId))
    .limit(1);

  return rows[0]?.id ?? null;
}
