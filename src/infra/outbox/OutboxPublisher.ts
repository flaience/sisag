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
 *  - from a service that already has a pg client (transaction): use publishWithClient(client, ...)
 *  - otherwise: use publish(...)
 */

import { db, pool } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";

export type OutboxEvent = {
  id?: string; // optional, generated if not provided
  aggregateType: string; // e.g. "appointment"
  aggregateId: string; // uuid of aggregate
  eventType: string; // e.g. "created", "cancelled"
  payload: any; // JSON serializable payload
  status?: "PENDING" | "SENT" | "FAILED" | "RETRYING" | "DEAD";
  attempts?: number;
  nextRetryAt?: string | Date | null;
};

/**
 * Publish an outbox event using drizzle (outside of existing pg transactions).
 * This is simpler to use when you don't need the event to be in the same DB tx as other writes.
 */
export async function publish(event: OutboxEvent) {
  const id = event.id ?? uuidv4();
  const now = new Date();

  const row = {
    id,
    aggregate_type: event.aggregateType,
    aggregate_id: event.aggregateId,
    event_type: event.eventType,
    payload: event.payload,
    status: event.status ?? "PENDING",
    attempts: event.attempts ?? 0,
    next_retry_at: event.nextRetryAt ? new Date(event.nextRetryAt) : null,
    created_at: now,
    updated_at: now,
  };

  // Using drizzle insert
  const [created] = await db
    .insert(outbox)
    .values({
      id: row.id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventType: row.event_type,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
    .returning();

  return created;
}

/**
 * Publish into an existing transaction using a pg client.
 *
 * IMPORTANT:
 * - Call this while you have an open transaction on the client (BEGIN has been issued).
 * - Use this when you want to guarantee the outbox row is inserted atomically with other inserts/updates.
 *
 * Example:
 *   const client = await pool.connect();
 *   try {
 *     await client.query("BEGIN");
 *     ... do other inserts using client ...
 *     await publishWithClient(client, event);
 *     await client.query("COMMIT");
 *   } catch (e) {
 *     await client.query("ROLLBACK");
 *   } finally {
 *     client.release();
 *   }
 */
export async function publishWithClient(
  client: PoolClient,
  event: OutboxEvent
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
      created_at,
      updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;
  `;

  const values = [
    id,
    event.aggregateType,
    event.aggregateId,
    event.eventType,
    JSON.stringify(event.payload ?? {}),
    event.status ?? "PENDING",
    event.attempts ?? 0,
    event.nextRetryAt ? new Date(event.nextRetryAt) : null,
    now,
    now,
  ];

  const res = await client.query(query, values);
  return res.rows[0];
}

/**
 * Convenience: publish an appointment-created event inside a transaction
 * Example usage inside AppointmentService transaction:
 *
 * await publishWithClient(client, {
 *   aggregateType: "appointment",
 *   aggregateId: appointment.id,
 *   eventType: "created",
 *   payload: appointment,
 * });
 */
export const OutboxPublisher = {
  publish,
  publishWithClient,
};
