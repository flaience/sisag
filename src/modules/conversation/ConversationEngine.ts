// src/modules/conversation/ConversationEngine.ts
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, conversationSessions } from "@/drizzle/schema";

import { BookingService } from "@/modules/bookings/Booking.service";
import { AvailabilityService } from "@/modules/availability/Availability.service";

// outbox (use o repository “congelado”)
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import type { OutboxEventType } from "@/domain/events/outbox-contracts";

// ✅ use seu parser (ajuste o path se necessário)
import { parseBRDateTime, parsePtBrDateTime } from "./parsers/datetimeBR";

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

  if (parsePtBrDateTime(t)) return "schedule";

  if (/(ajuda|help|como funciona)/.test(t)) return "help";
  // se parece data/hora pt-BR, trata como schedule

  return "unknown";
}

function formatHuman(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} às ${hh}:${mi}`;
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

  const next: SessionContext = {
    ...current,
    ...patch,
    pending: {
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

      // sempre registra o last inbound
      await updateSessionContext(session.id, {
        lastInboundAt: new Date().toISOString(),
        lastInboundText: input.text,
        lastIntent: intent,
      });

      /**
       * =========================
       * 1) state = awaiting_datetime
       * =========================
       */
      if (state === "awaiting_datetime") {
        const dt = parseBRDateTime(input.text, new Date());
        if (!dt) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não consegui entender a data/hora. Envie assim: *25/02 14:30*",
            meta: { sessionId: session.id, state, intent },
          });
          return { ok: true, clientId, intent: "schedule", replyQueued: true };
        }

        const serviceId = pending.serviceId ?? input.serviceId;
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

        const options: SlotOption[] = (slotsRes.slots ?? [])
          .filter(
            (s: any) =>
              typeof s?.startTime === "string" &&
              typeof s?.endTime === "string",
          )
          .slice(0, 3)
          .map((s: any) => ({ startTime: s.startTime, endTime: s.endTime }));

        if (!options.length) {
          await enqueueReply({
            companyId: input.companyId,
            clientId,
            toPhone: input.fromPhone,
            body: "Não encontrei horários próximos. Quer tentar outro horário?",
            meta: { sessionId: session.id, state, intent },
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
        const idx = Number(normalizeText(input.text)) - 1;

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

        const serviceId = pending.serviceId ?? input.serviceId;
        if (!serviceId) {
          await updateSessionContext(session.id, {
            state: "awaiting_datetime",
            pending: {},
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
          lastBookingId: r.booking?.id,
          lastBookingStartTime: r.booking?.startTime,
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
        await updateSessionContext(session.id, {
          state: "awaiting_datetime",
          pending: { serviceId: input.serviceId ?? pending.serviceId },
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: "Perfeito ✅\nMe diga *dia e horário* (ex: 25/02 às 14:30).",
          meta: { sessionId: session.id, state: "awaiting_datetime", intent },
        });

        return { ok: true, clientId, intent, replyQueued: true };
      }

      if (intent === "confirm") {
        const bookingId = ctx.lastBookingId;

        const r = bookingId
          ? await BookingService.confirmById({
              companyId: input.companyId,
              clientId,
              bookingId,
            })
          : await BookingService.confirmLatestPending({
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
          state: "idle",
          pending: {}, // limpa
          lastBookingId: r.bookingId,
          lastBookingStartTime:
            (r as any).startTime?.toISOString?.() ?? (r as any).startTime,
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: `Confirmado ✅\n📅 ${formatHuman((r as any).startTime)}`,
          meta: { intent, sessionId: session.id, bookingId: r.bookingId },
        });

        return { ok: true, clientId, intent, replyQueued: true };
      }

      if (intent === "cancel") {
        const bookingId = ctx.lastBookingId;

        const r = bookingId
          ? await BookingService.cancelById({
              companyId: input.companyId,
              clientId,
              bookingId,
            })
          : await BookingService.cancelLatest({
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
          pending: {}, // limpa
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId,
          toPhone: input.fromPhone,
          body: `Cancelado ✅\n📅 ${formatHuman((r as any).startTime)}`,
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
