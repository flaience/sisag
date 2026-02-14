// src/infra/outbox/OutboxPublisher.ts
/**
 * OutboxPublisher
 *
 * Utilities to publish outbox events either:
 *  - outside transactions (publish)
 *  - inside an existing transaction (publishWithClient)
 *
 * Uses:
 *  - db (drizzle) for simple publishes
 *  - client (pg Client) if you want the insert inside a transaction
 *
 * Usage:
 *  - from a service that already has a pg client (transaction): use publishWithClient(client, ... )
 *  - otherwise: use publish(... )
 */

import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import type { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export type OutboxStatus =
  | "pending"
  | "processing"
  | "sent"
  | "retrying"
  | "dead";

export type OutboxEvent = {
  id?: string; // optional, generated if not provided
  aggregateType: string; // e.g. "appointment"
  aggregateId: string; // uuid of aggregate
  eventType: string; // e.g. "appointment.created"
  payload: any; // JSON serializable payload

  status?: OutboxStatus;
  attempts?: number;
  nextRetryAt?: string | Date | null;

  // ✅ NEW: idempotência por dedupeKey (aproveita unique parcial do schema)
  dedupeKey?: string | null;
};

/**
 * Publish an outbox event using drizzle (outside of existing pg transactions).
 */
export async function publish(event: OutboxEvent) {
  const id = event.id ?? uuidv4();
  const now = new Date();

  const db = getDb();
  const [created] = await db
    .insert(outbox)
    .values({
      id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      payload: event.payload ?? {},
      status: event.status ?? "pending",
      attempts: event.attempts ?? 0,
      nextRetryAt: event.nextRetryAt ? new Date(event.nextRetryAt) : null,
      createdAt: now,
      updatedAt: now,

      // ✅ dedupeKey
      dedupeKey: event.dedupeKey ?? null,
    })
    .returning();

  return created;
}

/**
 * Publish into an existing transaction using a pg client.
 */
export async function publishWithClient(
  client: PoolClient,
  event: OutboxEvent,
) {
  const id = event.id ?? uuidv4();
  const now = new Date();

  const query = `
    INSERT INTO outbox (
      id,
      aggregate_type,
      aggregate_id,
      event_type,
      payload,
      status,
      attempts,
      next_retry_at,
      dedupe_key,
      created_at,
      updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *;
  `;

  const values = [
    id,
    event.aggregateType,
    event.aggregateId,
    event.eventType,
    JSON.stringify(event.payload ?? {}),
    event.status ?? "pending",
    event.attempts ?? 0,
    event.nextRetryAt ? new Date(event.nextRetryAt) : null,
    event.dedupeKey ?? null, // ✅ dedupeKey
    now,
    now,
  ];

  const res = await client.query(query, values);
  return res.rows[0];
}

export const OutboxPublisher = {
  publish,
  publishWithClient,
};
