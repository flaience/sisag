import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  // Buscar todos eventos pendentes
  const db = getDb();
  const events = await db
    .select()
    .from(outbox)
    .where(eq(outbox.status, "pending"))
    .limit(10);

  if (events.length === 0) {
    return NextResponse.json({ ok: true, message: "No events" });
  }

  for (const evt of events) {
    try {
      // enviar para o n8n (substituir URL do webhook n8n)
      await fetch("https://SEU_N8N_URL/webhook/sisag/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt),
      });

      // marcar como enviado
      await db
        .update(outbox)
        .set({ status: "sent" })
        .where(eq(outbox.id, evt.id));
    } catch (err) {
      await db
        .update(outbox)
        .set({
          status: "failed",
          lastError: String(err),
        })
        .where(eq(outbox.id, evt.id));
    }
  }

  return NextResponse.json({ ok: true, sent: events.length });
}
