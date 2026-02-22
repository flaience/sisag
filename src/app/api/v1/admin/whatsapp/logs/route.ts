import { NextResponse } from "next/server";
import { getPgPool } from "@/lib/pg";
import type { WhatsAppLogsResponse } from "@/modules/whatsapp/contracts";

// cursor = base64(json) com { created_at, id }
function decodeCursor(
  cursor?: string | null,
): { created_at: string; id: string } | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const obj = JSON.parse(json);
    if (typeof obj?.created_at === "string" && typeof obj?.id === "string")
      return obj;
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(input: { created_at: string; id: string }) {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64");
}

// TODO: plugar no seu tenant real (sessão/subdomínio/header)
function getCompanyIdFromRequest(): string {
  return "dummy-company-id";
}

export async function GET(req: Request) {
  const companyId = getCompanyIdFromRequest();

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
  const status = url.searchParams.get("status"); // pending|sent|...
  const q = (url.searchParams.get("q") ?? "").trim();
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  /**
   * Assumimos:
   * - outbox: id (uuid), created_at (timestamptz), status, attempts, last_error, event_type, payload (jsonb), company_id
   * - message_logs: outbox_id (uuid), provider_message_id, status (sent/failed), created_at (timestamptz)
   *
   * Se seus nomes diferirem, você só troca aqui no SQL.
   */
  const pool = getPgPool();

  const params: any[] = [companyId, limit];
  let where = `o.company_id = $1 AND o.event_type = 'whatsapp.send.requested'`;

  if (status) {
    params.push(status);
    where += ` AND o.status = $${params.length}`;
  }

  if (q) {
    // Procura por telefone/texto no payload (jsonb)
    params.push(`%${q}%`);
    where += ` AND (
      (o.payload->>'toPhone') ILIKE $${params.length}
      OR (o.payload->>'text') ILIKE $${params.length}
    )`;
  }

  if (cursor) {
    params.push(cursor.created_at, cursor.id);
    // keyset pagination
    where += ` AND (o.created_at, o.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
  }

  const sql = `
    SELECT
      o.id as outbox_id,
      o.created_at,
      o.status,
      COALESCE(o.attempts, 0) as attempts,
      o.last_error,
      (o.payload->>'toPhone') as to_phone,
      LEFT(COALESCE(o.payload->>'text',''), 140) as text_preview,
      ml.provider_message_id
    FROM outbox o
    LEFT JOIN LATERAL (
      SELECT provider_message_id
      FROM message_logs
      WHERE outbox_id = o.id
      ORDER BY created_at DESC
      LIMIT 1
    ) ml ON TRUE
    WHERE ${where}
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(sql, params);

  const items = rows.map((r: any) => ({
    outbox_id: r.outbox_id,
    created_at: new Date(r.created_at).toISOString(),
    status: r.status,
    attempts: Number(r.attempts ?? 0),
    last_error: r.last_error ?? null,
    to_phone: r.to_phone ?? null,
    text_preview: r.text_preview ?? null,
    provider_message_id: r.provider_message_id ?? null,
  }));

  const next_cursor =
    items.length === limit
      ? encodeCursor({
          created_at: items[items.length - 1].created_at,
          id: items[items.length - 1].outbox_id,
        })
      : null;

  const data: WhatsAppLogsResponse = { items, next_cursor };
  return NextResponse.json(data, { status: 200 });
}
