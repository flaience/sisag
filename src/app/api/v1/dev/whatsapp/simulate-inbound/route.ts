import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import {
  clients,
  conversationSessions,
  whatsappWebhookEvents,
} from "@/drizzle/schema";
import { ConversationEngine } from "@/modules/conversation/ConversationEngine";

export async function GET() {
  return NextResponse.json({ route: "simulate-inbound" });
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();

    const companyId = String(body.companyId ?? "");
    const fromPhone = String(body.fromPhone ?? "");
    const text = String(body.text ?? "");
    const serviceId = body.serviceId ? String(body.serviceId) : undefined;

    if (!companyId || !fromPhone || !text) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          required: ["companyId", "fromPhone", "text"],
        },
        { status: 400 },
      );
    }

    // 1) garante client (company + phone)
    const found = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(eq(clients.companyId, companyId), eq(clients.phoneE164, fromPhone)),
      )
      .limit(1);

    let clientId = found[0]?.id;

    if (!clientId) {
      const created = await db
        .insert(clients)
        .values({
          companyId,
          name: `Inbound ${fromPhone}`,
          phoneE164: fromPhone,
          email: null,
          notes: "auto-created from simulate-inbound",
        })
        .returning({ id: clients.id });

      clientId = created[0]?.id;
    }

    if (!clientId) throw new Error("client_create_failed");

    // 2) garante sessão open
    await db
      .insert(conversationSessions)
      .values({
        companyId,
        clientId,
        status: "open",
        context: { createdBy: "simulate-inbound" },
      })
      .onConflictDoNothing();

    // 3) grava webhook event (audit)
    await db.insert(whatsappWebhookEvents).values({
      companyId,
      whatsappAccountId: null,
      provider: "mock",
      eventType: "inbound_message",
      providerMessageId: null,
      payload: { fromPhone, text, simulated: true },
      headers: { simulated: true },
    });

    // 4) processa engine (vai enfileirar resposta via outbox)
    const result = await ConversationEngine.handleInbound({
      companyId,
      clientId,
      fromPhone,
      text,
      serviceId,
      createdBy: "simulate-inbound",
    });

    return NextResponse.json({ clientId, ...result });
  } catch (err: any) {
    console.error("SIMULATE INBOUND ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
