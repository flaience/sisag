//src/modules/outbox/outbox.repository.ts
import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";

export async function outboxInsert(event: {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
}) {
  const db = getDb();
  await db.insert(outbox).values({
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    payload: event.payload,
    status: "pending",
  });
}
