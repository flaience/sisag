//src/modules/conversation/ConversationEngine.ts
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { conversationSessions } from "@/drizzle/schema";

import { outboxInsert } from "@/modules/outbox/outbox.repository";
import { BookingService } from "@/modules/bookings/Booking.service";
import { AvailabilityService } from "@/modules/availability/Availability.service";

type Intent = "greeting" | "schedule" | "confirm" | "cancel" | "unknown";

type EngineInput = {
  companyId: string;
  clientId: string;
  fromPhone: string;
  text: string;

  // opcional: se a rota já souber o serviceId (dev/test)
  serviceId?: string;

  // metadados
  createdBy?: string; // "simulate-inbound" etc
};

type EngineResult = {
  ok: true;
  intent: Intent;
  replyQueued: boolean;
};

type SessionContext = {
  state?: "idle" | "awaiting_datetime" | "awaiting_slot_choice";

  pending?: {
    serviceId?: string;
    requestedStartTime?: string; // ISO
    slotOptions?: { startTime: string; endTime: string }[]; // ISO
  };

  lastIntent?: Intent;
  lastInboundAt?: string;
  lastInboundText?: string;
  createdBy?: string;

  lastBookingId?: string;
  lastBookingStartTime?: string;
};

function normalizeText(input: string) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim();
}

function detectIntent(text: string): Intent {
  const t = normalizeText(text);

  if (/(oi|ola|bom dia|boa tarde|boa noite)\b/.test(t)) return "greeting";
  if (/(agendar|marcar|consulta|horario|agenda)\b/.test(t)) return "schedule";
  if (/(confirmar|confirmo|sim|ok|confirmado)\b/.test(t)) return "confirm";
  if (/(cancelar|desmarcar|cancelamento)\b/.test(t)) return "cancel";

  return "unknown";
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatHuman(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);

  // formata em pt-BR (sem depender de Intl timezone)
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${dd}/${mm} às ${hh}:${mi}`;
}

/**
 * Parse simples pt-BR:
 * Aceita:
 * - "25/02 14:30"
 * - "25/02 às 14:30"
 * - "25/02 as 14:30"
 * - "25/02 �s 14:30" (texto corrompido)
 * - "2026-02-25 14:30"
 *
 * Assume ano atual se não vier ano.
 */
function parsePtBrDateTime(text: string, now = new Date()) {
  const raw = text ?? "";
  const t = normalizeText(raw)
    .replaceAll("às", " ")
    .replaceAll("as", " ")
    .replaceAll("�s", " ") // caso "às" corrompido
    .replace(/\s+/g, " ")
    .trim();

  // ISO-like: 2026-02-25 14:30
  const isoLike = t.match(/^(\d{4})-(\d{2})-(\d{2})[ t](\d{1,2}):(\d{2})$/);
  if (isoLike) {
    const year = Number(isoLike[1]);
    const month = Number(isoLike[2]);
    const day = Number(isoLike[3]);
    const hour = Number(isoLike[4]);
    const minute = Number(isoLike[5]);

    const d = new Date(now);
    d.setFullYear(year, month - 1, day);
    d.setHours(hour, minute, 0, 0);

    if (!Number.isNaN(d.getTime())) {
      return { ok: true as const, date: d, iso: d.toISOString() };
    }
  }

  // dd/mm [yyyy] hh:mm
  const m = t.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})$/,
  );
  if (!m) return { ok: false as const, error: "invalid_format" as const };

  const day = Number(m[1]);
  const month = Number(m[2]);
  const yearRaw = m[3];
  const hour = Number(m[4]);
  const minute = Number(m[5]);

  const year = yearRaw
    ? yearRaw.length === 2
      ? 2000 + Number(yearRaw)
      : Number(yearRaw)
    : now.getFullYear();

  const d = new Date(now);
  d.setFullYear(year, month - 1, day);
  d.setHours(hour, minute, 0, 0);

  if (Number.isNaN(d.getTime())) {
    return { ok: false as const, error: "invalid_date" as const };
  }

  return { ok: true as const, date: d, iso: d.toISOString() };
}

async function getOrCreateSession(params: {
  companyId: string;
  clientId: string;
  createdBy?: string;
}) {
  const db = getDb();

  const rows = await db
    .select({
      id: conversationSessions.id,
      status: conversationSessions.status,
      context: conversationSessions.context,
    })
    .from(conversationSessions)
    .where(
      and(
        eq(conversationSessions.companyId, params.companyId),
        eq(conversationSessions.clientId, params.clientId),
        eq(conversationSessions.status, "open"),
      ),
    )
    .limit(1);

  if (rows[0]) return rows[0];

  const inserted = await db
    .insert(conversationSessions)
    .values({
      companyId: params.companyId,
      clientId: params.clientId,
      status: "open",
      context: {
        state: "idle",
        createdBy: params.createdBy ?? "unknown",
      },
    })
    .returning({
      id: conversationSessions.id,
      status: conversationSessions.status,
      context: conversationSessions.context,
    });

  return inserted[0]!;
}

async function patchSessionContext(
  sessionId: string,
  patch: Partial<SessionContext>,
) {
  const db = getDb();
  const session = await db
    .select({ context: conversationSessions.context })
    .from(conversationSessions)
    .where(eq(conversationSessions.id, sessionId))
    .limit(1);

  const current = (session[0]?.context ?? {}) as SessionContext;

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
    } as any)
    .where(eq(conversationSessions.id, sessionId));

  return next;
}

async function enqueueReply(params: {
  companyId: string;
  clientId: string;
  toPhone: string;
  body: string;
  meta?: Record<string, any>;
}) {
  // ✅ outbox direto para WhatsApp worker/dispatcher
  await outboxInsert({
    aggregateType: "conversation",
    aggregateId: params.clientId,
    eventType: "whatsapp.send_text" as any,
    payload: {
      companyId: params.companyId,
      clientId: params.clientId,
      toPhone: params.toPhone,
      body: params.body,
      meta: params.meta ?? {},
    },
  });
}

export class ConversationEngine {
  static async handleInbound(input: EngineInput): Promise<EngineResult> {
    const now = new Date();
    const session = await getOrCreateSession({
      companyId: input.companyId,
      clientId: input.clientId,
      createdBy: input.createdBy,
    });

    const ctx = (session.context ?? {}) as SessionContext;
    const state = ctx.state ?? "idle";

    const intent = detectIntent(input.text);

    await patchSessionContext(session.id, {
      lastIntent: intent,
      lastInboundAt: now.toISOString(),
      lastInboundText: input.text,
    });

    // ===========
    // GREETING
    // ===========
    if (intent === "greeting") {
      await patchSessionContext(session.id, {
        state: "idle",
      });

      await enqueueReply({
        companyId: input.companyId,
        clientId: input.clientId,
        toPhone: input.fromPhone,
        body:
          "Olá! 😊\n" +
          "Posso te ajudar a *agendar*, *confirmar* ou *cancelar* um horário.\n" +
          "O que você deseja fazer?",
        meta: { intent, sessionId: session.id, state },
      });

      return { ok: true, intent, replyQueued: true };
    }

    // ===========
    // CONFIRM / CANCEL (funcionam em qualquer state)
    // ===========
    if (intent === "confirm") {
      try {
        const r = await BookingService.confirmLatestPending({
          companyId: input.companyId,
          clientId: input.clientId,
        });

        if (!r.ok) {
          await enqueueReply({
            companyId: input.companyId,
            clientId: input.clientId,
            toPhone: input.fromPhone,
            body: "Não encontrei nenhum agendamento pendente para confirmar. Quer agendar um novo?",
            meta: { intent, sessionId: session.id, state },
          });
          return { ok: true, intent, replyQueued: true };
        }

        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body: `Confirmado ✅\n📅 ${formatHuman(r.startTime as any)}`,
          meta: { intent, sessionId: session.id, bookingId: r.bookingId },
        });

        return { ok: true, intent, replyQueued: true };
      } catch (err: any) {
        console.error("CONFIRM ERROR:", err);
        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body: "Tive um problema ao confirmar 😕 Pode tentar novamente?",
          meta: { intent, sessionId: session.id, state, error: err?.message },
        });
        return { ok: true, intent, replyQueued: true };
      }
    }

    if (intent === "cancel") {
      try {
        const r = await BookingService.cancelLatest({
          companyId: input.companyId,
          clientId: input.clientId,
        });

        if (!r.ok) {
          await enqueueReply({
            companyId: input.companyId,
            clientId: input.clientId,
            toPhone: input.fromPhone,
            body: "Não encontrei nenhum agendamento ativo para cancelar.",
            meta: { intent, sessionId: session.id, state },
          });
          return { ok: true, intent, replyQueued: true };
        }

        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body: `Cancelado ✅\n📅 ${formatHuman(r.startTime as any)}`,
          meta: { intent, sessionId: session.id, bookingId: r.bookingId },
        });

        return { ok: true, intent, replyQueued: true };
      } catch (err: any) {
        console.error("CANCEL ERROR:", err);
        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body: "Tive um problema ao cancelar 😕 Pode tentar novamente?",
          meta: { intent, sessionId: session.id, state, error: err?.message },
        });
        return { ok: true, intent, replyQueued: true };
      }
    }

    // ===========
    // SCHEDULE FLOW
    // ===========
    if (state === "idle") {
      // se o usuário disser "agendar" ou algo parecido, pedimos data/hora
      if (intent === "schedule") {
        const serviceId = input.serviceId ?? ctx.pending?.serviceId;

        await patchSessionContext(session.id, {
          state: "awaiting_datetime",
          pending: { serviceId: serviceId ?? undefined },
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body:
            "Perfeito ✅\n" +
            "Me diga *dia e horário* (ex: 25/02 14:30).\n" +
            "Se preferir, diga também o serviço.",
          meta: { intent, sessionId: session.id, state: "idle" },
        });

        return { ok: true, intent, replyQueued: true };
      }

      // fallback
      await enqueueReply({
        companyId: input.companyId,
        clientId: input.clientId,
        toPhone: input.fromPhone,
        body:
          "Entendi 🙂\n" + "Você quer *agendar*, *confirmar* ou *cancelar*?",
        meta: { intent, sessionId: session.id, state },
      });

      return { ok: true, intent, replyQueued: true };
    }

    // ===========
    // AWAITING_DATETIME
    // ===========
    if (state === "awaiting_datetime") {
      const serviceId = input.serviceId ?? ctx.pending?.serviceId;

      if (!serviceId) {
        await patchSessionContext(session.id, {
          state: "idle",
          pending: {},
        });

        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body: "Qual serviço você deseja agendar?",
          meta: { intent, sessionId: session.id, state },
        });

        return { ok: true, intent, replyQueued: true };
      }

      const parsed = parsePtBrDateTime(input.text, now);
      if (!parsed.ok) {
        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body:
            "Não consegui entender a data/hora 😕\n" +
            "Tente assim: *25/02 14:30*",
          meta: {
            intent,
            sessionId: session.id,
            state,
            parseError: parsed.error,
          },
        });

        return { ok: true, intent, replyQueued: true };
      }

      const result = await BookingService.createAuto({
        companyId: input.companyId,
        clientId: input.clientId,
        serviceId,
        startTime: parsed.iso,
        notes: "booking via conversation",
      });

      if (!result.ok) {
        if (result.error === "slot_taken") {
          const dateStr = parsed.iso.slice(0, 10); // YYYY-MM-DD

          const slotsRes = await AvailabilityService.listSlots({
            companyId: input.companyId,
            serviceId,
            date: dateStr,
          });

          const list = slotsRes.ok ? slotsRes.slots : [];
          const suggestions = list
            .filter((s: any) => typeof s?.startTime === "string")
            .slice(0, 3);

          const sugText =
            suggestions.length > 0
              ? "\nSugestões:\n" +
                suggestions
                  .map((s: any) => `• ${formatHuman(s.startTime)}`)
                  .join("\n")
              : "";

          await enqueueReply({
            companyId: input.companyId,
            clientId: input.clientId,
            toPhone: input.fromPhone,
            body:
              "Esse horário já está ocupado 😕\n" +
              `Quer tentar outro?${sugText}\n\n` +
              "Me diga um novo *dia e horário*.",
            meta: {
              intent,
              sessionId: session.id,
              state,
              conflictAt: parsed.iso,
            },
          });

          return { ok: true, intent, replyQueued: true };
        }

        await enqueueReply({
          companyId: input.companyId,
          clientId: input.clientId,
          toPhone: input.fromPhone,
          body:
            "Tive um problema para agendar 😕\n" +
            "Pode tentar novamente com outro horário?",
          meta: { intent, sessionId: session.id, state, error: result.error },
        });

        return { ok: true, intent, replyQueued: true };
      }

      // sucesso
      await patchSessionContext(session.id, {
        state: "idle",
        pending: {},
        lastBookingId: result.booking.id,
        lastBookingStartTime: result.booking.startTime,
      });

      await enqueueReply({
        companyId: input.companyId,
        clientId: input.clientId,
        toPhone: input.fromPhone,
        body:
          "Agendado ✅\n" +
          `📅 ${formatHuman(result.booking.startTime)}\n\n` +
          "Se quiser, responda *confirmar* para confirmar agora.",
        meta: {
          intent,
          sessionId: session.id,
          bookingId: result.booking.id,
          startTime: result.booking.startTime,
        },
      });

      return { ok: true, intent, replyQueued: true };
    }

    // fallback final
    await enqueueReply({
      companyId: input.companyId,
      clientId: input.clientId,
      toPhone: input.fromPhone,
      body: "Você quer *agendar*, *confirmar* ou *cancelar*?",
      meta: { intent, sessionId: session.id, state },
    });

    return { ok: true, intent, replyQueued: true };
  }
}
