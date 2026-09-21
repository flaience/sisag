// No startup side effects. Dependency injection keeps tests offline.
export async function requestMetaMessage(url, token, payload, fetchImpl = fetch, timeoutMs = 15000) {
  try {
    const response = await fetchImpl(url, {
      method: 'POST', redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.json();
    if (!response.ok) {
      const rejected = response.status >= 400 && response.status < 500 &&
        response.status !== 408 && Number.isInteger(body?.error?.code);
      return { ok: false, provider: 'meta', outcome: rejected ? 'rejected' : 'unknown',
        error: rejected ? `meta_rejected_${body.error.code}` : 'meta_result_unknown', response: null };
    }
    const id = body?.messages?.[0]?.id;
    if (typeof id !== 'string' || !id.trim()) throw new Error('missing_message_id');
    return { ok: true, provider: 'meta', providerMessageId: id, response: body };
  } catch {
    // A timeout, dropped connection or malformed response does NOT prove non-delivery.
    return { ok: false, provider: 'meta', outcome: 'unknown', error: 'meta_result_unknown', response: null };
  }
}

export async function dispatchWhatsAppSafely({ client, row, workerId, send, writeLog }) {
  // Autocommitted fence BEFORE external I/O. This status is excluded by pending/failed claims.
  // Crashes after this fence require manual reconciliation, never automatic resend.
  const fence = await client.query(`UPDATE outbox SET status='delivery_unknown',
    attempts=attempts+1, next_retry_at=NULL, last_error='whatsapp_dispatch_started', updated_at=NOW()
    WHERE id=$1 AND locked_by=$2 AND status='processing' RETURNING id`, [row.id, workerId]);
  if (fence.rowCount !== 1) return { outcome: 'not_owned' };

  let result;
  try { result = await send(); }
  catch { result = { ok: false, outcome: 'unknown', provider: 'meta' }; }
  const accepted = result?.ok === true && typeof result.providerMessageId === 'string' && !!result.providerMessageId.trim();
  const rejected = result?.ok === false && result.outcome === 'rejected';
  if (!accepted && !rejected) {
    // Keep the durable fence, including when the database is unavailable.
    return { outcome: 'unknown' };
  }

  try {
    await client.query('BEGIN');
    const state = accepted ? 'done' : 'delivery_rejected';
    const saved = await client.query(`UPDATE outbox SET status=$3, locked_at=NULL,
      locked_by=NULL, next_retry_at=NULL, last_error=$4, updated_at=NOW()
      WHERE id=$1 AND locked_by=$2 AND status='delivery_unknown' RETURNING id`,
      [row.id, workerId, state, accepted ? null : 'whatsapp_rejected']);
    if (saved.rowCount !== 1) throw new Error('lost_ownership');
    await writeLog(result, accepted ? 'sent' : 'failed');
    await client.query('COMMIT');
    return { outcome: accepted ? 'accepted' : 'rejected' };
  } catch {
    // COMMIT response loss may mean it committed: never change it back to failed.
    try { await client.query('ROLLBACK'); } catch { /* disconnected */ }
    return { outcome: 'persistence_uncertain' };
  }
}
