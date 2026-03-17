// src/modules/conversation/ConversationEngine.ts
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, conversationSessions } from "@/drizzle/schema";
import { formatPtBr } from "@/lib/time";

import { BookingService } from "@/modules/bookings/Booking.service";
import { AvailabilityService } from "@/modules/availability/Availability.service";

// outbox (use o repository “congelado”)
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import type { OutboxEventType } from "@/domain/events/outbox-contracts";

// ✅ parser PT-BR (retorna Date ou null)
import { parsePtBrDateTime } from "./parsers/datetimeBR";

export type Intent =
  | "greeting"
  | "schedule"
  | "confirm"
  | "cancel"
  | "help"
  | "unknown";

type SlotOption = { startTime: string; endTime: string };

type SessionContext = {
  state?: "idle" | "awaiting_datetime" | "awaiting_slot_choice";

  pending?: {
    serviceId?: string;
    requestedStartTime?: string; // ISO
    slotOptions?: SlotOption[]; // ISO
  };

  lastIntent?: Intent;
  lastInboundAt?: string;
  lastInboundText?: string;
  createdBy?: string;

  lastBookingId?: string;
  lastBookingStartTime?: string;
};

export type ConversationProcessInput = {
  companyId: string;
  fromPhone: string;
  text: string;
  serviceId?: string; // opcional (simulate-inbound já passa)
};

export type ConversationProcessResult =
  | { ok: true; intent: Intent; replyQueued: boolean; clientId: string }
  | {
      ok: false;
      error:
        | "missing_params"
        | "invalid_phone"
        | "client_not_found"
        | "internal_error";
      message?: string;
    };

function normalizeText(t: string) {
  return (t ?? "").toLowerCase().trim();
}

function isChoice123(t: string) {
  return /^[1-3]$/.test(normalizeText(t));
}

function detectIntent(text: string): Intent {
  const t = normalizeText(text);

  if (/(^|\s)(oi|ol[aá]|bom dia|boa tarde|boa noite)(\s|$)/.test(t))
    return "greeting";

  if (/(^|\s)(confirmar|confirmo|confirmado|sim confirmo)(\s|$)/.test(t))
    return "confirm";

  if (/(^|\s)(cancelar|cancela|cancelado|desmarcar)(\s|$)/.test(t))
    return "cancel";

  if (/(agendar|marcar|consulta|hor[aá]rio|quero agendar)/.test(t))
    return "schedule";

  // ✅ parser recebe o texto ORIGINAL (sem normalize)
  if (parsePtBrDateTime(text)) return "schedule";

  if (/(ajuda|help|como funciona)/.test(t)) return "help";

  return "unknown";
}

function formatHuman(isoOrDate: string | Date) {
  const iso =
    typeof isoOrDate === "string" ? isoOrDate : isoOrDate.toISOString();
  return formatPtBr(iso);
}

async function enqueueReply(params: {
  companyId: string;
  clientId: string;
  toPhone: string;
  body: string;
  meta?: any;
}) {
  const eventType: OutboxEventType = "whatsapp.send_text" as any;

  await outboxInsert({
    aggregateType: "conversation",
    aggregateId: params.clientId,
    eventType,
    payload: {
      companyId: params.companyId,
      clientId: params.clientId,
      toPhone: params.toPhone,
      body: params.body,
      meta: params.meta ?? {},
    },
  });
}

async function findClientIdByPhone(params: {
  companyId: string;
  phoneE164: string;
}) {
  const db = getDb();
  const rows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.companyId, params.companyId),
        eq(clients.phoneE164, params.phoneE164),
      ),
    )
    .limit(1);

  return rows[0]?.id ?? null;
}

/**
 * Busca a sessão aberta do cliente na empresa; se não existir, cria.
 */
async function getOrCreateSession(params: {
  companyId: string;
  clientId: string;
  createdBy: string;
}) {
  const db = getDb();

  const existing = await db
    .select()
    .from(conversationSessions)
    .where(
      and(
        eq(conversationSessions.companyId, params.companyId),
        eq(conversationSessions.clientId, params.clientId),
        eq(conversationSessions.status, "open"),
      ),
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(conversationSessions)
    .values({
      companyId: params.companyId,
      clientId: params.clientId,
      status: "open",
      context: {
        state: "idle",
        pending: {},
        createdBy: params.createdBy,
      } satisfies SessionContext,
    })
    .returning();

  return inserted[0];
}

async function updateSessionContext(
  sessionId: string,
  patch: Partial<SessionContext>,
) {
  const db = getDb();

  const rows = await db
    .select({ context: conversationSessions.context })
    .from(conversationSessions)
    .where(eq(conversationSessions.id, sessionId))
    .limit(1);

  const current = (rows[0]?.context ?? {}) as SessionContext;

  const shouldReplacePending = Object.prototype.hasOwnProperty.call(
    patch,
    "pending",
  );

  const next: SessionContext = {
    ...current,
    ...patch,
    pending: shouldReplacePending
      ? (patch.pending ?? {}) // <- se veio pending no patch, substitui (inclusive vazio)
      : {
          ...(current.pending ?? {}),
          ...(patch.pending ?? {}),
        },
  };

  await db
    .update(conversationSessions)
    .set({
      context: next as any,
      updatedAt: new Date(),
    })
    .where(eq(conversationSessions.id, sessionId));

  return next;
}

export class ConversationEngine {
  /**
   * Entry point usado pelo route simulate-inbound / webhook.
   */
  static async process(
    input: ConversationProcessInput,
  ): Promise<ConversationProcessResult> {
    try {
      if (!input.companyId || !input.fromPhone || !input.text) {
        return { ok: false, error: "missing_params" };
      }

      if (!input.fromPhone.startsWith("+")) {
        return { ok: false, error: "invalid_phone" };
      }

      const clientId = await findClientIdByPhone({
        companyId: input.companyId,
        phoneE164: input.fromPhone,
      });

      if (!clientId) {
        return {
          ok: false,
          error: "client_not_found",
          message: "Client not found for this phone in this company.",
        };
      }

      const session = await getOrCreateSession({
        companyId: input.companyId,
        clientId,
        createdBy: "conversation-engine",
      });

      const ctx = (session.context ?? {}) as SessionContext;
      const state = ctx.state ?? "idle";
      const pending = ctx.pending ?? {};

      const intent = detectIntent(input.text);
      const nowIso = new Date().toISOString();
      const textNorm = normalizeText(input.text);

      // anti-dup simples: mesmo texto em menos de 20s => ignora
      const lastText = normalizeText(ctx.lastInboundText ?? "");
      const lastAt = ctx.lastInboundAt
        ? new Date(ctx.lastInboundAt).getTime()
        : 0;
      const now = Date.now();

      if (
        lastText &&
        lastText === textNorm &&
        lastAt &&
        now - lastAt < 20_000
      ) {
        await updateSessionContext(session.id, { lastInboundAt: nowIso });
        return {
          ok: true,
          clientId,
          intent,
          replyQueued: false,
        };
      }

      // sempre registra o last inbound
      await updateSessionContext(session.id, {
        lastInboundAt: nowIso,
        lastInboundText: input.text,
        lastIntent: intent,
      });

      // ✅ sempre que vier serviceId no input, persiste na sessão (para não "sumir")
      const effectiveServiceId = input.serviceId ?? pending.serviceId;
      if (input.serviceId && input.serviceId !== pending.serviceId) {
        await updateSessionContext(session.id, {
          pending: { serviceId: input.serviceId },
        });
      }

      /**
       * =========================
       * 1) state = awaiting_datetime
       * =========================
       */
      if (state === "awaiting_datetime") {
        // ✅ GUARD PREMIUM: não aceitar "1/2/3" enquanto espera data/hora
        if (isChoice123(input.text)) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Antes preciso do *dia e horário* (ex: 28/02 10:00).",
            meta: { sessionId: session.id, state, intent },
          });
          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        // ✅ COMANDOS GLOBAIS: permitir cancelar/confirmar mesmo durante awaiting_datetime
        if (intent === "cancel") {
          const bookingId = ctx.lastBookingId;

          if (bookingId) {
            const r = await BookingService.cancelById({
              companyId: input.companyId,
              clientId,
              bookingId,
              actor: "whatsapp",
            });

            if (r.ok) {
              await updateSessionContext(session.id, {
                state: "idle",
                pending: {},
                lastBookingId: r.bookingId,
                lastBookingStartTime: (r.startTime as any)
                  ? new Date(r.startTime as any).toISOString()
                  : undefined,
              });

              await enqueueReply({
                companyId: input.companyId,
                clientId,
                toPhone: input.fromPhone,
                body: `Cancelado ✅\n📅 ${formatHuman(r.startTime as any)}`,
                meta: { intent, sessionId: session.id, bookingId: r.bookingId },
              });

              return { ok: true, clientId, intent, replyQueued: true };
            }
          }

          const r = await BookingService.cancelLatest({
            companyId: input.companyId,
            clientId,
          } as any);

          if (!r.ok) {
            await enqueueReply({
              companyId: input.companyId,
              clientId,
              toPhone: input.fromPhone,
              body: "Não encontrei nenhum agendamento ativo para cancelar.",
              meta: { intent, sessionId: session.id, state },
            });
            return { ok: true, clientId, intent, replyQueued: true };
          }

          await updateSessionContext(session.id, {
            state: "idle",
            pending: {},
            lastBookingId: r.bookingId,
            lastBookingStartTime: (r.startTime as any)
              ? new Date(r.startTime as any).toISOString()
              : undefined,
          });

          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: `Cancelado ✅\n📅 ${formatHuman(r.startTime as any)}`,
            meta: { intent, sessionId: session.id, bookingId: r.bookingId },
          });

          return { ok: true, clientId, intent, replyQueued: true };
        }

        if (intent === "confirm") {
          const bookingId = ctx.lastBookingId;

          if (bookingId) {
            const r = await BookingService.confirmById({
              companyId: input.companyId,
              clientId,
              bookingId,
              actor: "whatsapp",
            });

            if (r.ok) {
              await updateSessionContext(session.id, {
                state: "idle",
                pending: {},
                lastBookingId: r.bookingId,
                lastBookingStartTime: (r.startTime as any)
                  ? new Date(r.startTime as any).toISOString()
                  : undefined,
              });

              await enqueueReply({
                companyId: input.companyId,
                clientId,
                toPhone: input.fromPhone,
                body: `Confirmado ✅\n📅 ${formatHuman(r.startTime as any)}`,
                meta: { intent, sessionId: session.id, bookingId: r.bookingId },
              });

              return { ok: true, clientId, intent, replyQueued: true };
            }
          }

          const r = await BookingService.confirmLatestPending({
            companyId: input.companyId,
            clientId,
            actor: "whatsapp",
          } as any);

          if (!r.ok) {
            await enqueueReply({
              companyId: input.companyId,
              clientId,
              toPhone: input.fromPhone,
              body: "Não encontrei nenhum agendamento pendente para confirmar.",
              meta: { intent, sessionId: session.id, state },
            });
            return { ok: true, clientId, intent, replyQueued: true };
          }

          await updateSessionContext(session.id, {
            state: "idle",
            pending: {},
            lastBookingId: r.bookingId,
            lastBookingStartTime: (r.startTime as any)
              ? new Date(r.startTime as any).toISOString()
              : undefined,
          });

          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: `Confirmado ✅\n📅 ${formatHuman(r.startTime as any)}`,
            meta: { intent, sessionId: session.id, bookingId: r.bookingId },
          });

          return { ok: true, clientId, intent, replyQueued: true };
        }

        // ✅ parse robusto (trim/normalização já no parser, mas não custa)
        const dt = parsePtBrDateTime(input.text);

        if (!dt) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não consegui entender a data/hora. Envie assim: *28/02 10:00*",
            meta: { sessionId: session.id, state, intent, raw: input.text },
          });
          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        const serviceId = effectiveServiceId;
        if (!serviceId) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Qual serviço você deseja agendar?",
            meta: { sessionId: session.id, state, intent },
          });
          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        // console.log("[conv] awaiting_datetime", {
        //   companyId: input.companyId,
        //   clientId,
        //   serviceId,
        //   rawText: input.text,
        //   parsed: dt?.toISOString?.() ?? null,
        // });

        const slotsRes = await AvailabilityService.listSlots({
          companyId: input.companyId,
          serviceId,
          startTime: dt,
        } as any);

        if (!slotsRes?.ok) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não consegui consultar disponibilidade agora. Tente novamente.",
            meta: {
              sessionId: session.id,
              state,
              intent,
              error: slotsRes?.error,
            },
          });
          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        // console.log("[conv] slotsRes", {
        //   ok: slotsRes?.ok,

        //   slotsCount: (slotsRes?.slots ?? []).length,
        //   first: (slotsRes?.slots ?? [])[0],
        // });

        const options: SlotOption[] = (slotsRes.slots ?? [])
          .filter(
            (s: any) =>
              typeof s?.startTime === "string" &&
              typeof s?.endTime === "string",
          )
          .slice(0, 3)
          .map((s: any) => ({ startTime: s.startTime, endTime: s.endTime }));

        if (!options.length) {
          // mantém o serviceId na sessão (não zera)
          await updateSessionContext(session.id, {
            pending: { serviceId },
          });

          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não encontrei horários próximos. Quer tentar outro dia/horário?",
            meta: {
              sessionId: session.id,
              state,
              intent,
              requested: dt.toISOString(),
            },
          });
          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        await updateSessionContext(session.id, {
          state: "awaiting_slot_choice",
          pending: {
            serviceId,
            requestedStartTime: dt.toISOString(),
            slotOptions: options,
          },
        });

        const lines = options
          .map((o, i) => `${i + 1}) ${formatHuman(o.startTime)}`)
          .join("\n");

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: `Encontrei estes horários ✅\n${lines}\n\nResponda com *1*, *2* ou *3*.`,
          meta: {
            sessionId: session.id,
            state: "awaiting_slot_choice",
            intent,
          },
        });

        return { ok: true, clientId, intent: "schedule", replyQueued: true };
      }

      /**
       * =========================
       * 2) state = awaiting_slot_choice
       * =========================
       */
      if (state === "awaiting_slot_choice") {
        // ✅ aceita só 1/2/3
        if (!isChoice123(input.text)) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Responda apenas com *1*, *2* ou *3*.",
            meta: { sessionId: session.id, state, intent },
          });
          return { ok: true, clientId, intent, replyQueued: true };
        }

        const idx = Number(textNorm) - 1;

        const options = pending.slotOptions ?? [];
        const picked = options[idx];

        if (!picked) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Escolha inválida. Responda com *1*, *2* ou *3*.",
            meta: { sessionId: session.id, state, intent },
          });
          return { ok: true, clientId, intent, replyQueued: true };
        }

        const serviceId = effectiveServiceId;
        if (!serviceId) {
          // volta para awaiting_datetime, mas mantém o que der
          await updateSessionContext(session.id, {
            state: "awaiting_datetime",
            pending: { serviceId: input.serviceId ?? pending.serviceId },
          });

          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Qual serviço você deseja agendar?",
            meta: { sessionId: session.id, intent },
          });

          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        const r = await BookingService.createAuto({
          companyId: input.companyId,
          clientId,
          serviceId,
          startTime: picked.startTime,
          notes: null,
        } as any);

        if (!r.ok) {
          await updateSessionContext(session.id, {
            state: "awaiting_datetime",
            pending: { serviceId },
          });

          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Esse horário acabou de ficar indisponível 😕 Me diga outro dia e horário.",
            meta: { sessionId: session.id, error: r.error },
          });

          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        await updateSessionContext(session.id, {
          state: "idle",
          pending: {},
          lastBookingId: r.booking.id,
          lastBookingStartTime: r.booking.startTime,
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: `Agendado ✅\n📅 ${formatHuman(r.booking.startTime)}`,
          meta: { sessionId: session.id, bookingId: r.booking.id },
        });

        return { ok: true, clientId, intent: "schedule", replyQueued: true };
      }

      /**
       * =========================
       * INTENTS quando state = idle
       * =========================
       */

      // ✅ guard premium: se usuário manda "1" do nada no idle
      if (state === "idle" && isChoice123(input.text)) {
        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: "Para agendar, me diga *dia e horário* (ex: 28/02 10:00) ou escreva *quero agendar*.",
          meta: { sessionId: session.id, state, intent },
        });
        return { ok: true, clientId, intent: "help", replyQueued: true };
      }

      if (intent === "help") {
        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: "Posso ajudar com:\n- *agendar*\n- *confirmar*\n- *cancelar*\n\nO que você deseja?",
          meta: { sessionId: session.id, state, intent },
        });
        return { ok: true, clientId, intent, replyQueued: true };
      }

      if (intent === "greeting") {
        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: "Olá! 😊 Quer *agendar*, *confirmar* ou *cancelar* um horário?",
          meta: { sessionId: session.id, state, intent },
        });
        return { ok: true, clientId, intent, replyQueued: true };
      }

      if (intent === "schedule") {
        // ✅ se a mensagem já é data/hora, entra direto em awaiting_datetime mas reaproveita o mesmo texto
        // (mantém simples: seta estado e pede novamente caso falhe no bloco awaiting_datetime)
        await updateSessionContext(session.id, {
          state: "awaiting_datetime",
          pending: { serviceId: effectiveServiceId },
        });

        // Se usuário já mandou data/hora (detectIntent chamou parse), responde com prompt padrão
        // e deixa ele mandar de novo (premium: evita dupla execução/duplicidade)
        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: "Perfeito ✅\nMe diga *dia e horário* (ex: 28/02 10:00).",
          meta: { sessionId: session.id, state: "awaiting_datetime", intent },
        });

        return { ok: true, clientId, intent, replyQueued: true };
      }

      if (intent === "confirm") {
        const bookingId = ctx.lastBookingId;

        // 1) tenta por bookingId (mais preciso)
        if (bookingId) {
          const r = await BookingService.confirmById({
            companyId: input.companyId,
            clientId,
            bookingId,
            actor: "whatsapp",
          });

          if (r.ok) {
            await enqueueReply({
              companyId: input.companyId,
              clientId,
              toPhone: input.fromPhone,
              body: `Confirmado ✅\n📅 ${formatHuman(r.startTime)}`,
              meta: { intent, sessionId: session.id, bookingId: r.bookingId },
            });
            return { ok: true, clientId, intent, replyQueued: true };
          }
        }

        // 2) fallback: confirma o último PENDING
        const r = await BookingService.confirmLatestPending({
          companyId: input.companyId,
          clientId,
        } as any);

        if (!r.ok) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não encontrei nenhum agendamento pendente para confirmar. Quer agendar um novo?",
            meta: { intent, sessionId: session.id, state },
          });
          return { ok: true, clientId, intent, replyQueued: true };
        }

        await updateSessionContext(session.id, {
          lastBookingId: r.bookingId,
          lastBookingStartTime: r.startTime
            ? new Date(r.startTime as any).toISOString()
            : undefined,
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: `Confirmado ✅\n📅 ${formatHuman(r.startTime as any)}`,
          meta: { intent, sessionId: session.id, bookingId: r.bookingId },
        });

        return { ok: true, clientId, intent, replyQueued: true };
      }

      if (intent === "cancel") {
        const bookingId = ctx.lastBookingId;

        // 1) tenta por bookingId
        if (bookingId) {
          const r = await BookingService.cancelById({
            companyId: input.companyId,
            clientId,
            bookingId,
          });

          if (r.ok) {
            await enqueueReply({
              companyId: input.companyId,
              clientId,
              toPhone: input.fromPhone,
              body: `Cancelado ✅\n📅 ${formatHuman(r.startTime)}`,
              meta: { intent, sessionId: session.id, bookingId: r.bookingId },
            });
            return { ok: true, clientId, intent, replyQueued: true };
          }
        }

        // 2) fallback: cancela latest
        const r = await BookingService.cancelLatest({
          companyId: input.companyId,
          clientId,
          actor: "whatsapp",
        } as any);

        if (!r.ok) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não encontrei nenhum agendamento ativo para cancelar.",
            meta: { intent, sessionId: session.id, state },
          });
          return { ok: true, clientId, intent, replyQueued: true };
        }

        await updateSessionContext(session.id, {
          lastBookingId: r.bookingId,
          lastBookingStartTime: r.startTime
            ? new Date(r.startTime as any).toISOString()
            : undefined,
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: `Cancelado ✅\n📅 ${formatHuman(r.startTime as any)}`,
          meta: { intent, sessionId: session.id, bookingId: r.bookingId },
        });

        return { ok: true, clientId, intent, replyQueued: true };
      }

      // fallback
      await enqueueReply({
        companyId: input.companyId,
        clientId,
        toPhone: input.fromPhone,
        body: "Não entendi 😅\nVocê quer *agendar*, *confirmar* ou *cancelar*?",
        meta: { sessionId: session.id, state, intent },
      });

      return { ok: true, clientId, intent: "unknown", replyQueued: true };
    } catch (err: any) {
      console.error("ConversationEngine.process ERROR:", err);
      return {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Error",
      };
    }
  }
}
