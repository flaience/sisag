// src/modules/outbox/Outbox.service.ts
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

type OutboxEnqueueParams = {
  aggregateType: string;
  aggregateId: string; // uuid em string
  eventType: string;
  payload: any;
};

export class OutboxService {
  static async enqueue(p: OutboxEnqueueParams) {
    // status precisa ser minúsculo por causa do CHECK (status = lower(status))
    await getDb().execute(sql`
      insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status)
      values (
        ${p.aggregateType},
        ${p.aggregateId}::uuid,
        ${p.eventType},
        ${JSON.stringify(p.payload)}::jsonb,
        'pending'
      )
    `);
  }
}
