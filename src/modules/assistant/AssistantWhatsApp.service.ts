// src/modules/assistant/AssistantWhatsApp.service.ts
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { interpretMessage } from "./whatsapp-core/interpreter/interpretMessage";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { ClientResolverService } from "@/modules/clients/ClientResolver.service";
import { ConversationSessionService } from "./whatsapp-core/sessions/ConversationSession.service";
import { MessageComposer } from "./whatsapp-core/composer/MessageComposer";

import {
  normalizeYesNo,
  parseChoiceIndex,
  composeCancelOptions,
} from "./whatsapp-core/utils/assistant-helpers";

import { getDb } from "@/lib/db";
import { professionals, schedulingConfig } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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
    if (!companyId) {
      return { ok: false, error: "missing_company_id" as const };
    }

    const fromPhoneE164 = normalizePhoneE164(input.phone);
    const textRaw = (input.text || "").trim();
    const textNorm = normalizeYesNo(textRaw);

    const clientResolver = new ClientResolverService();
    const client = await clientResolver.resolveOrCreate({
      companyId,
      phoneE164: fromPhoneE164,
      name: input.fromName ?? null,
    });

    const sessions = new ConversationSessionService();
    const openSession = await sessions.getOpen(companyId, client.id);

    const sessionCtx: ConversationContext = (openSession?.context as any) ?? {};
    const composer = new MessageComposer();

    let replyText = "";

    if (
      sessionCtx.pendingIntent === "CANCEL_REQUEST" &&
      sessionCtx.pendingCancel &&
      sessionCtx.pendingCancel.options?.length
    ) {
      const pc = sessionCtx.pendingCancel;

      // ✅ CHOOSE: aceitar 1/2/3
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

      // ✅ confirmação SIM/NÃO
      if (textNorm === "YES") {
        const minAdvanceMinutes = await getMinCancelAdvanceMinutes(companyId);

        // ✅ se ainda está em CHOOSE e não escolheu, força escolher
        if (pc.mode === "CHOOSE" && !pc.chosenAppointmentId) {
          replyText = composeCancelOptions(pc.options);

          return await publishReply({
            companyId,
            toPhone: fromPhoneE164,
            replyText,
            clientId: client.id,
            correlationId: input.correlationId,
          });
        }

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
        if (pc.mode === "CHOOSE") {
          replyText = composeCancelOptions(pc.options);
        } else {
          const first = pc.options[0];
          const when = formatPtBr(first.scheduledTimeUtc);
          replyText = `Você quer cancelar o agendamento de ${when}?\n\nResponda *SIM* ou *NÃO*.`;
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

    const interpreted = interpretMessage(textRaw, new Date());

    const pending = sessionCtx.pending ?? {};
    const mergedDateIso = interpreted.slots.dateIso ?? pending.dateIso;
    const mergedTime = interpreted.slots.time ?? pending.time;

    if (interpreted.intent === "HELP") {
      replyText = composer.help();
      if (openSession) await sessions.close(openSession.id);
    } else if (interpreted.intent === "CANCEL_REQUEST") {
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
          pendingCancel: {
            mode: "CHOOSE",
            options,
            chosenAppointmentId: null,
          },
        } satisfies ConversationContext);

        replyText = composeCancelOptions(options);
      }
    } else {
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
              replyText = `Não consegui agendar: ${result.message}`;
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

  try {
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

    console.log("[assistant/whatsapp] outbox published", {
      outboxId: created?.id,
      dedupeKey,
    });

    return { ok: true as const };
  } catch (e: any) {
    const isDuplicate =
      e?.code === "23505" ||
      String(e?.message ?? "").includes("outbox_dedupe_key_uq");

    if (isDuplicate) {
      console.log("[assistant/whatsapp] deduped publish", { dedupeKey });
      return { ok: true as const, deduped: true as const };
    }

    console.error("[assistant/whatsapp] publish failed", {
      error: String(e?.message ?? e),
      code: e?.code,
      dedupeKey,
    });
    throw e;
  }
}
