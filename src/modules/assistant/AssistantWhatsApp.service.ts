// src/modules/assistant/AssistantWhatsApp.service.ts
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { interpretMessage } from "./whatsapp-core/interpreter/interpretMessage";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { ClientResolverService } from "@/modules/clients/ClientResolver.service";
import { ConversationSessionService } from "./whatsapp-core/sessions/ConversationSession.service";
import { MessageComposer } from "./whatsapp-core/composer/MessageComposer";
import { logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { professionals, schedulingConfig } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getActionResultMessage } from "@/lib/ui/actionResult";

import { AppointmentService } from "@/modules/appointments/Appointment.service";
import { AppointmentRepository } from "@/modules/appointments/Appointment.repository";
import {
  DEFAULT_TIMEZONE,
  zonedDateTimeToUtcISOString,
  formatPtBr,
} from "@/lib/time";
import crypto from "crypto";
import type { ConversationContext } from "./whatsapp-core/sessions/types";

export class AssistantWhatsAppService {
  static async handleInbound(input: {
    companyId: string;
    phone: string;
    text: string;
    correlationId?: string | null;
    fromName?: string | null;
  }) {
    const companyId = input.companyId;
    if (!companyId) return { ok: false, error: "missing_company_id" as const };

    const fromPhoneE164 = normalizePhoneE164(input.phone);
    const textRaw = (input.text || "").trim();
    const textNorm = normalizeYesNo(textRaw);

    // 1) resolve/cria cliente por (companyId, phoneE164)
    const clientResolver = new ClientResolverService();
    const client = await clientResolver.resolveOrCreate({
      companyId,
      phoneE164: fromPhoneE164,
      name: input.fromName ?? null,
    });

    // 2) carrega sessão
    const sessions = new ConversationSessionService();
    const openSession = await sessions.getOpen(companyId, client.id);
    const sessionCtx: ConversationContext = (openSession?.context as any) ?? {};
    const composer = new MessageComposer();

    let replyText = "";

    /**
     * ✅ 2.1) CANCEL pending (já estava funcionando)
     */
    if (
      sessionCtx.pendingIntent === "CANCEL_REQUEST" &&
      sessionCtx.pendingCancel &&
      sessionCtx.pendingCancel.options?.length
    ) {
      const pc = sessionCtx.pendingCancel;

      // CHOOSE (1/2/3)
      const choiceIdx = parseChoiceIndex(textRaw);
      if (
        choiceIdx !== null &&
        pc.mode === "CHOOSE" &&
        pc.options?.[choiceIdx]
      ) {
        const chosen = pc.options[choiceIdx];
        const when = formatPtBr(chosen.scheduledTimeUtc);

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "CANCEL_REQUEST",
          pendingCancel: {
            mode: "SINGLE",
            options: [chosen],
            chosenAppointmentId: chosen.appointmentId,
          },
        } satisfies ConversationContext);

        replyText = `Você quer cancelar o agendamento de ${when}?\n\nResponda *SIM* ou *NÃO*.`;

        return await publishReply({
          companyId,
          toPhone: fromPhoneE164,
          replyText,
          clientId: client.id,
          correlationId: input.correlationId,
        });
      }

      // SIM/NÃO
      if (textNorm === "YES") {
        const minAdvanceMinutes = await getMinCancelAdvanceMinutes(companyId);

        const appointmentId =
          pc.chosenAppointmentId ?? pc.options?.[0]?.appointmentId;

        if (!appointmentId) {
          replyText =
            "Não consegui identificar qual agendamento cancelar. Tente novamente: “cancelar”.";
        } else {
          const cancel = await AppointmentService.cancelByIdForClient({
            companyId,
            clientId: client.id,
            appointmentId,
            minAdvanceMinutes,
          });

          replyText = cancel.ok
            ? cancel.replyText
            : (cancel.message ??
              "Não consegui cancelar. Se quiser, diga: “ajuda”.");
        }

        if (openSession) await sessions.close(openSession.id);
      } else if (textNorm === "NO") {
        replyText = "Ok 👍 não cancelei.";
        if (openSession) await sessions.close(openSession.id);
      } else {
        replyText =
          pc.mode === "CHOOSE"
            ? composeCancelOptions(pc.options)
            : (() => {
                const first = pc.options[0];
                const when = formatPtBr(first.scheduledTimeUtc);
                return `Você quer cancelar o agendamento de ${when}?\n\nResponda *SIM* ou *NÃO*.`;
              })();
      }

      return await publishReply({
        companyId,
        toPhone: fromPhoneE164,
        replyText,
        clientId: client.id,
        correlationId: input.correlationId,
      });
    }

    /**
     * ✅ 2.2) RESCHEDULE pending (NOVO)
     * - aceita 1/2/3 (CHOOSE)
     * - depois pede nova data/hora
     * - quando tiver date+time -> converte SP->UTC e chama AppointmentService.reschedule
     */
    if (
      sessionCtx.pendingIntent === "RESCHEDULE_REQUEST" &&
      sessionCtx.pendingReschedule &&
      sessionCtx.pendingReschedule.options?.length
    ) {
      const pr = sessionCtx.pendingReschedule;

      // (A) Se está em CHOOSE, aceitar 1/2/3
      const choiceIdx = parseChoiceIndex(textRaw);
      if (
        choiceIdx !== null &&
        pr.mode === "CHOOSE" &&
        pr.options?.[choiceIdx]
      ) {
        const chosen = pr.options[choiceIdx];
        const when = formatPtBr(chosen.scheduledTimeUtc);

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "RESCHEDULE_REQUEST",
          pendingReschedule: {
            mode: "SINGLE",
            options: [chosen],
            chosenAppointmentId: chosen.appointmentId,
            pendingNew: {}, // vai preencher depois
          },
        } satisfies ConversationContext);

        replyText =
          `Certo. Você quer *remarcar* o agendamento de ${when}.\n\n` +
          `Agora me diga a *nova data e horário* (ex: 15/02 10:00).`;

        return await publishReply({
          companyId,
          toPhone: fromPhoneE164,
          replyText,
          clientId: client.id,
          correlationId: input.correlationId,
        });
      }

      // (B) Se já escolheu um appointment, tentar capturar nova data/hora
      const chosenId = pr.chosenAppointmentId ?? pr.options?.[0]?.appointmentId;

      if (!chosenId) {
        // não deveria acontecer, mas garante
        replyText =
          "Não consegui identificar qual agendamento remarcar. Diga: “remarcar”.";
        if (openSession) await sessions.close(openSession.id);

        return await publishReply({
          companyId,
          toPhone: fromPhoneE164,
          replyText,
          clientId: client.id,
          correlationId: input.correlationId,
        });
      }

      // interpreta mensagem atual e faz merge com pendingNew
      const interpreted = interpretMessage(textRaw, new Date());
      const pendingNew = pr.pendingNew ?? {};
      const mergedDateIso = interpreted.slots.dateIso ?? pendingNew.dateIso;
      const mergedTime = interpreted.slots.time ?? pendingNew.time;

      // faltou info -> atualizar sessão e perguntar de novo
      if (!mergedDateIso || !mergedTime) {
        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "RESCHEDULE_REQUEST",
          pendingReschedule: {
            ...pr,
            chosenAppointmentId: chosenId,
            pendingNew: { dateIso: mergedDateIso, time: mergedTime },
          },
        } satisfies ConversationContext);

        replyText = "Perfeito — só falta a *data e horário*.\nEx: 15/02 10:00.";

        return await publishReply({
          companyId,
          toPhone: fromPhoneE164,
          replyText,
          clientId: client.id,
          correlationId: input.correlationId,
        });
      }

      // temos nova data/hora -> converter SP -> UTC ISO e remarcar
      const newIsoUtc = zonedDateTimeToUtcISOString(
        mergedDateIso,
        mergedTime,
        DEFAULT_TIMEZONE,
      );

      const result = await AppointmentService.reschedule(chosenId, newIsoUtc);

      if (!(result as any)?.ok) {
        replyText = `Não consegui remarcar: ${(result as any)?.message ?? "erro"}.`;
      } else {
        replyText = `✅ Agendamento remarcado.\n📅 ${formatPtBr(newIsoUtc)}`;
        if (openSession) await sessions.close(openSession.id);
      }

      return await publishReply({
        companyId,
        toPhone: fromPhoneE164,
        replyText,
        clientId: client.id,
        correlationId: input.correlationId,
      });
    }

    // 3) interpreta mensagem normalmente
    const interpreted = interpretMessage(textRaw, new Date());

    // 4) merge slots: mensagem atual + sessão (agendamento)
    const pending = sessionCtx.pending ?? {};
    const mergedDateIso = interpreted.slots.dateIso ?? pending.dateIso;
    const mergedTime = interpreted.slots.time ?? pending.time;

    // HELP
    if (interpreted.intent === "HELP") {
      replyText = composer.help();
      if (openSession) await sessions.close(openSession.id);
    }

    // CANCEL (começa fluxo)
    else if (interpreted.intent === "CANCEL_REQUEST") {
      const upcoming = await AppointmentRepository.listNextActiveByClient({
        companyId,
        clientId: client.id,
        now: new Date(),
        limit: 3,
      });

      if (!upcoming.length) {
        replyText =
          "Não encontrei nenhum agendamento futuro para cancelar. Se quiser, diga: “ajuda”.";
      } else if (upcoming.length === 1) {
        const one: any = upcoming[0];
        const scheduledUtcIso =
          typeof one.scheduledTime === "string"
            ? one.scheduledTime
            : new Date(one.scheduledTime).toISOString();

        const when = formatPtBr(scheduledUtcIso);

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "CANCEL_REQUEST",
          pendingCancel: {
            mode: "SINGLE",
            options: [
              { appointmentId: one.id, scheduledTimeUtc: scheduledUtcIso },
            ],
            chosenAppointmentId: one.id,
          },
        } satisfies ConversationContext);

        replyText = `Você quer cancelar o agendamento de ${when}?\n\nResponda *SIM* ou *NÃO*.`;
      } else {
        const options = (upcoming as any[]).map((a) => ({
          appointmentId: a.id,
          scheduledTimeUtc:
            typeof a.scheduledTime === "string"
              ? a.scheduledTime
              : new Date(a.scheduledTime).toISOString(),
        }));

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "CANCEL_REQUEST",
          pendingCancel: { mode: "CHOOSE", options, chosenAppointmentId: null },
        } satisfies ConversationContext);

        replyText = composeCancelOptions(options);
      }
    }

    // ✅ RESCHEDULE (começa fluxo)
    else if (interpreted.intent === "RESCHEDULE_REQUEST") {
      const upcoming = await AppointmentRepository.listNextActiveByClient({
        companyId,
        clientId: client.id,
        now: new Date(),
        limit: 3,
      });

      if (!upcoming.length) {
        replyText =
          "Não encontrei nenhum agendamento futuro para remarcar. Se quiser, diga: “ajuda”.";
      } else if (upcoming.length === 1) {
        const one: any = upcoming[0];
        const scheduledUtcIso =
          typeof one.scheduledTime === "string"
            ? one.scheduledTime
            : new Date(one.scheduledTime).toISOString();

        const when = formatPtBr(scheduledUtcIso);

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "RESCHEDULE_REQUEST",
          pendingReschedule: {
            mode: "SINGLE",
            options: [
              { appointmentId: one.id, scheduledTimeUtc: scheduledUtcIso },
            ],
            chosenAppointmentId: one.id,
            pendingNew: {},
          },
        } satisfies ConversationContext);

        replyText =
          `Você quer *remarcar* o agendamento de ${when}.\n\n` +
          `Me diga a *nova data e horário* (ex: 15/02 10:00).`;
      } else {
        const options = (upcoming as any[]).map((a) => ({
          appointmentId: a.id,
          scheduledTimeUtc:
            typeof a.scheduledTime === "string"
              ? a.scheduledTime
              : new Date(a.scheduledTime).toISOString(),
        }));

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "RESCHEDULE_REQUEST",
          pendingReschedule: {
            mode: "CHOOSE",
            options,
            chosenAppointmentId: null,
            pendingNew: {},
          },
        } satisfies ConversationContext);

        replyText = composeRescheduleOptions(options);
      }
    }

    // AGENDAR ou continuação
    else {
      const wantsSchedule =
        interpreted.intent === "SCHEDULE_REQUEST" ||
        sessionCtx.pendingIntent === "SCHEDULE_REQUEST";

      if (!wantsSchedule) {
        replyText = composer.unknown();
      } else {
        if (!mergedDateIso || !mergedTime) {
          await sessions.openOrUpdate(companyId, client.id, {
            pendingIntent: "SCHEDULE_REQUEST",
            pending: { dateIso: mergedDateIso, time: mergedTime },
          } satisfies ConversationContext);

          replyText = composer.askMissingDateTime();
        } else {
          const scheduledIsoUtc = zonedDateTimeToUtcISOString(
            mergedDateIso,
            mergedTime,
            DEFAULT_TIMEZONE,
          );

          const professionalId = await pickDefaultProfessional(companyId);

          if (!professionalId) {
            replyText =
              "Não encontrei nenhum profissional ativo para agendar. Fale com o administrador.";
          } else {
            const result = await AppointmentService.create({
              professionalId,
              clientId: client.id,
              scheduledTime: scheduledIsoUtc,
            });

            if (!result.ok) {
              replyText = `Não consegui agendar: ${getActionResultMessage(result, "Ocorreu um erro.")}`;
            } else {
              if (openSession) await sessions.close(openSession.id);

              const protocol = result.appointment?.id ?? "OK";
              replyText = composer.createdOk({
                scheduledIsoUtc,
                protocol,
                professionalName: null,
              });
            }
          }
        }
      }
    }

    return await publishReply({
      companyId,
      toPhone: fromPhoneE164,
      replyText,
      clientId: client.id,
      correlationId: input.correlationId,
    });
  }
}

/* ===========================
   Helpers
=========================== */

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

async function getMinCancelAdvanceMinutes(companyId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({
      minCancelAdvanceMinutes: schedulingConfig.minCancelAdvanceMinutes,
    })
    .from(schedulingConfig)
    .where(eq(schedulingConfig.companyId, companyId))
    .limit(1);

  return rows[0]?.minCancelAdvanceMinutes ?? 0;
}

function normalizeYesNo(text: string): "YES" | "NO" | "OTHER" {
  const t = (text || "").trim().toLowerCase();
  if (["sim", "s", "yes", "y", "ok", "confirmo", "confirmar"].includes(t))
    return "YES";
  if (["não", "nao", "n", "no"].includes(t)) return "NO";
  return "OTHER";
}

async function publishReply(params: {
  companyId: string;
  toPhone: string;
  replyText: string;
  clientId: string;
  correlationId?: string | null;
}) {
  const baseCorrelation =
    params.correlationId ??
    crypto
      .createHash("sha256")
      .update(
        `${params.companyId}:${params.toPhone}:${params.replyText}:${new Date()
          .toISOString()
          .slice(0, 16)}`,
      )
      .digest("hex")
      .slice(0, 32);

  const dedupeKey = `wa_send:${baseCorrelation}`;

  const created = await OutboxPublisher.publish({
    aggregateType: "whatsapp_message",
    aggregateId: crypto.randomUUID(),
    eventType: "whatsapp.send.requested",
    payload: {
      companyId: params.companyId,
      toPhone: params.toPhone,
      text: params.replyText,
      clientId: params.clientId,
      correlationId: baseCorrelation,
      meta: { source: "api", emittedAt: new Date().toISOString() },
    },
    status: "pending",
    dedupeKey,
  });

  logger.debug("[assistant/whatsapp] outbox published", {
    outboxId: created?.id,
    dedupeKey,
  });

  return { ok: true as const };
}

function parseChoiceIndex(text: string): number | null {
  const t = (text || "").trim();
  if (!/^[1-3]$/.test(t)) return null;
  return Number(t) - 1;
}

function composeCancelOptions(
  options: Array<{ appointmentId: string; scheduledTimeUtc: string }>,
) {
  const lines = options.slice(0, 3).map((opt, idx) => {
    const when = formatPtBr(opt.scheduledTimeUtc);
    return `${idx + 1}) ${when}`;
  });

  return `Encontrei mais de um agendamento.\n\nQual você quer cancelar?\n${lines.join(
    "\n",
  )}\n\nResponda com *1*, *2* ou *3*.`;
}

function composeRescheduleOptions(
  options: Array<{ appointmentId: string; scheduledTimeUtc: string }>,
) {
  const lines = options.slice(0, 3).map((opt, idx) => {
    const when = formatPtBr(opt.scheduledTimeUtc);
    return `${idx + 1}) ${when}`;
  });

  return `Encontrei mais de um agendamento.\n\nQual você quer *remarcar*?\n${lines.join(
    "\n",
  )}\n\nResponda com *1*, *2* ou *3*.`;
}
