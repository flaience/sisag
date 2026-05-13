import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { messageLogs } from "@/drizzle/schema";

type MetaStatusValue = "sent" | "delivered" | "read" | "failed";

export async function applyMetaMessageStatus(params: {
  providerMessageId: string;
  status: MetaStatusValue;
  error?: string | null;
}) {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select()
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.provider, "meta"),
        eq(messageLogs.providerMessageId, params.providerMessageId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { ok: false as const, reason: "message_log_not_found" };
  }

  const patch: Partial<typeof row> & {
    status: string;
    deliveredAt?: Date | null;
    readAt?: Date | null;
    failedAt?: Date | null;
    error?: string | null;
  } = {
    status: params.status,
  };

  if (params.status === "delivered") {
    patch.deliveredAt = now;
  }

  if (params.status === "read") {
    patch.readAt = now;
    if (!row.deliveredAt) {
      patch.deliveredAt = now;
    }
  }

  if (params.status === "failed") {
    patch.failedAt = now;
    patch.error = params.error ?? "Meta delivery failure";
  }

  await db.update(messageLogs).set(patch).where(eq(messageLogs.id, row.id));

  return { ok: true as const };
}
