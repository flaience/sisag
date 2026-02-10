import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";

// 🔒 CONTRATO CONGELADO
import type { OutboxEventType } from "@/domain/events/outbox-contracts";

type OutboxInsertParams<TPayload = any> = {
  aggregateType: string;
  aggregateId: string;
  eventType: OutboxEventType; // ✅ TRAVA AQUI
  payload: TPayload;
};

export async function outboxInsert<TPayload = any>(
  event: OutboxInsertParams<TPayload>,
) {
  const db = getDb();

  await db.insert(outbox).values({
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventType: event.eventType, // só aceita canônico
    payload: event.payload,
    status: "pending",
  });
}
