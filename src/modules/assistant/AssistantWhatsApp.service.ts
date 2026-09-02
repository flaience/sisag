// src/modules/assistant/AssistantWhatsApp.service.ts
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { interpretMessage } from "./whatsapp-core/interpreter/interpretMessage";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { ClientResolverService } from "@/modules/clients/ClientResolver.service";
import { ConversationSessionService } from "./whatsapp-core/sessions/ConversationSession.service";
import { MessageComposer } from "./whatsapp-core/composer/MessageComposer";
import { logger } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { schedulingConfig } from "@/drizzle/schema";
import { listServiceLedAvailability } from "@/modules/availability/ServiceLedAvailability.service";
import { executeBookingCommand } from "@/modules/bookings/BookingCommand.service";
import { eq } from "drizzle-orm";
import { getActionResultMessage } from "@/lib/ui/actionResult";

import { WhatsAppBookingLifecycleService } from "@/modules/bookings/WhatsAppBookingLifecycle.service";
import { BookingReminderResponseService } from "@/modules/automation/BookingReminderResponse.service";
import { BookingFollowupFeedbackService } from "@/modules/automation/BookingFollowupFeedback.service";
import { BookingRecoveryResponseService } from "@/modules/automation/BookingRecoveryResponse.service";
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

    if (sessionCtx.pendingBookingDraft) {
      const draft = sessionCtx.pendingBookingDraft;
      if (textNorm === "NO" || /cancelar|desistir/i.test(textRaw)) {
        if (openSession) await sessions.close(openSession.id);
        return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: "Tudo bem — não confirmei o agendamento.", clientId: client.id, correlationId: input.correlationId });
      }
      if (textNorm !== "YES") {
        return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: "Para sua segurança, responda apenas *SIM* para confirmar ou *NÃO* para desistir.", clientId: client.id, correlationId: input.correlationId });
      }
      const result = await executeBookingCommand({ companyId, userId: null }, { clientId: client.id, unitId: draft.unitId, serviceId: draft.serviceId, professionalId: draft.professionalId, date: draft.dateIso, time: draft.time, source: "whatsapp", requestId: draft.requestId });
      if ("error" in result) {
        await sessions.openOrUpdate(companyId, client.id, { pendingIntent: "SCHEDULE_REQUEST", pending: { dateIso: draft.dateIso } } satisfies ConversationContext);
        return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: result.error === "slot_taken" ? "Esse horário acabou de ficar indisponível. Quer escolher outro?" : "Não consegui confirmar agora. Vou deixar a solicitação para uma nova tentativa.", clientId: client.id, correlationId: input.correlationId });
      }
      if (openSession) await sessions.close(openSession.id);
      return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: `Agendado ✅\n📅 ${formatPtBr(result.booking.startTime)}\nProtocolo: ${result.booking.id}`, clientId: client.id, correlationId: input.correlationId });
    }

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
            chosenBookingId: chosen.bookingId,
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

        const bookingId =
          pc.chosenBookingId ?? pc.options?.[0]?.bookingId;

        if (!bookingId) {
          replyText =
            "Não consegui identificar qual agendamento cancelar. Tente novamente: “cancelar”.";
        } else {
          const cancel = await WhatsAppBookingLifecycleService.cancel({
            companyId,
            clientId: client.id,
            bookingId,
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
     * - quando tiver date+time -> converte o horário e usa o ciclo seguro de bookings
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
            chosenBookingId: chosen.bookingId,
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
      const chosenId = pr.chosenBookingId ?? pr.options?.[0]?.bookingId;

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
            chosenBookingId: chosenId,
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

      const result = await WhatsAppBookingLifecycleService.reschedule({
        companyId,
        clientId: client.id,
        bookingId: chosenId,
        newStartTime: newIsoUtc,
      });

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

    const recoveryResponse = await BookingRecoveryResponseService.handle({ companyId, clientId: client.id, text: textRaw, correlationId: input.correlationId });
    if (recoveryResponse.handled) return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: recoveryResponse.replyText, clientId: client.id, correlationId: input.correlationId });

    const followupFeedback = await BookingFollowupFeedbackService.handle({ companyId, clientId: client.id, text: textRaw, correlationId: input.correlationId });
    if (followupFeedback.handled) return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: followupFeedback.replyText, clientId: client.id, correlationId: input.correlationId });

    const reminderResponse = await BookingReminderResponseService.handle({ companyId, clientId: client.id, text: textRaw, correlationId: input.correlationId });
    if (reminderResponse.handled) return await publishReply({ companyId, toPhone: fromPhoneE164, replyText: reminderResponse.replyText, clientId: client.id, correlationId: input.correlationId });

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
      const upcoming = await WhatsAppBookingLifecycleService.listUpcoming({
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
        const scheduledUtcIso = one.scheduledTimeUtc;

        const when = formatPtBr(scheduledUtcIso);

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "CANCEL_REQUEST",
          pendingCancel: {
            mode: "SINGLE",
            options: [
              { bookingId: one.bookingId, scheduledTimeUtc: scheduledUtcIso },
            ],
            chosenBookingId: one.bookingId,
          },
        } satisfies ConversationContext);

        replyText = `Você quer cancelar o agendamento de ${when}?\n\nResponda *SIM* ou *NÃO*.`;
      } else {
        const options = (upcoming as any[]).map((a) => ({
          bookingId: a.bookingId,
          scheduledTimeUtc: a.scheduledTimeUtc,
        }));

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "CANCEL_REQUEST",
          pendingCancel: { mode: "CHOOSE", options, chosenBookingId: null },
        } satisfies ConversationContext);

        replyText = composeCancelOptions(options);
      }
    }

    // ✅ RESCHEDULE (começa fluxo)
    else if (interpreted.intent === "RESCHEDULE_REQUEST") {
      const upcoming = await WhatsAppBookingLifecycleService.listUpcoming({
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
        const scheduledUtcIso = one.scheduledTimeUtc;

        const when = formatPtBr(scheduledUtcIso);

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "RESCHEDULE_REQUEST",
          pendingReschedule: {
            mode: "SINGLE",
            options: [
              { bookingId: one.bookingId, scheduledTimeUtc: scheduledUtcIso },
            ],
            chosenBookingId: one.bookingId,
            pendingNew: {},
          },
        } satisfies ConversationContext);

        replyText =
          `Você quer *remarcar* o agendamento de ${when}.\n\n` +
          `Me diga a *nova data e horário* (ex: 15/02 10:00).`;
      } else {
        const options = (upcoming as any[]).map((a) => ({
          bookingId: a.bookingId,
          scheduledTimeUtc: a.scheduledTimeUtc,
        }));

        await sessions.openOrUpdate(companyId, client.id, {
          pendingIntent: "RESCHEDULE_REQUEST",
          pendingReschedule: {
            mode: "CHOOSE",
            options,
            chosenBookingId: null,
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
          const defaults = await getBookingDefaults(companyId);
          if (!defaults.unitId || !defaults.serviceId) {
            replyText = "Ainda faltam os padrões de local e serviço para o agendamento automático. Vou encaminhar sua solicitação para a equipe.";
          } else {
            const availability = await listServiceLedAvailability({ companyId, unitId: defaults.unitId, serviceId: defaults.serviceId, date: mergedDateIso, limit: 200 });
            const requestedIso = zonedDateTimeToUtcISOString(mergedDateIso, mergedTime, defaults.timezone);
            const slot = availability.slots.find((item) => item.startTime === requestedIso && (!defaults.professionalId || item.professionalId === defaults.professionalId));
            if (!slot) {
              const suggestions = availability.slots.slice(0, 3).map((item) => formatPtBr(item.startTime, defaults.timezone)).join("\n");
              replyText = suggestions ? "Esse horário não está disponível. Posso oferecer:\n" + suggestions : "Não encontrei horários disponíveis nessa data. Quer tentar outro dia?";
            } else {
              const requestId = "whatsapp:" + client.id + ":" + slot.startTime;
              await sessions.openOrUpdate(companyId, client.id, { pendingIntent: "SCHEDULE_REQUEST", pendingBookingDraft: { unitId: defaults.unitId, serviceId: defaults.serviceId, professionalId: slot.professionalId, professionalName: slot.professionalName, dateIso: mergedDateIso, time: mergedTime, startTime: slot.startTime, requestId } } satisfies ConversationContext);
              replyText = `Posso confirmar este agendamento?\n📅 ${formatPtBr(slot.startTime, defaults.timezone)}\n👤 ${slot.professionalName}\n\nResponda *SIM* para confirmar ou *NÃO* para desistir.`;
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

async function getBookingDefaults(companyId: string) {
  const rows = await getDb().select({ unitId: schedulingConfig.defaultUnitId, serviceId: schedulingConfig.defaultServiceId, professionalId: schedulingConfig.defaultProfessionalId, timezone: schedulingConfig.timezone }).from(schedulingConfig).where(eq(schedulingConfig.companyId, companyId)).limit(1);
  return { unitId: rows[0]?.unitId ?? null, serviceId: rows[0]?.serviceId ?? null, professionalId: rows[0]?.professionalId ?? null, timezone: rows[0]?.timezone ?? DEFAULT_TIMEZONE };
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
  options: Array<{ bookingId: string; scheduledTimeUtc: string }>,
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
  options: Array<{ bookingId: string; scheduledTimeUtc: string }>,
) {
  const lines = options.slice(0, 3).map((opt, idx) => {
    const when = formatPtBr(opt.scheduledTimeUtc);
    return `${idx + 1}) ${when}`;
  });

  return `Encontrei mais de um agendamento.\n\nQual você quer *remarcar*?\n${lines.join(
    "\n",
  )}\n\nResponda com *1*, *2* ou *3*.`;
}
