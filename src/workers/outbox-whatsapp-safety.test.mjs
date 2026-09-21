import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requestMetaMessage, dispatchWhatsAppSafely } from './outbox-whatsapp-safety.mjs';

function fixture({ fail = '', result = { ok: true, providerMessageId: 'wamid.test' } } = {}) {
  let state = 'processing', backup, sends = 0, logs = 0, savedLogs = 0;
  const client = { async query(sql, values) {
    if (sql.includes("status='delivery_unknown',")) {
      if (fail === 'fence') throw Error('db');
      if (state !== 'processing') return { rowCount: 0 };
      state = 'delivery_unknown'; return { rowCount: 1 };
    }
    if (sql === 'BEGIN') { backup = state; savedLogs = logs; return {}; }
    if (sql.startsWith('UPDATE')) {
      if (fail === 'finalize') throw Error('db');
      if (fail === 'lost_owner') return { rowCount: 0 };
      state = values[2]; return { rowCount: 1 };
    }
    if (sql === 'COMMIT') {
      if (fail === 'commit_before') throw Error('db');
      backup = undefined;
      if (fail === 'commit_after') throw Error('response lost');
      return {};
    }
    if (sql === 'ROLLBACK') { if (backup !== undefined) { state = backup; logs = savedLogs; } return {}; }
    throw Error('unexpected SQL');
  } };
  const execute = () => dispatchWhatsAppSafely({ client, row: { id: 'row' }, workerId: 'worker',
    send: async () => { sends++; assert.equal(state, 'delivery_unknown'); if (fail === 'send') throw Error('network'); return result; },
    writeLog: async () => { if (fail === 'log') throw Error('db'); logs++; },
  });
  return { execute, state: () => state, sends: () => sends, logs: () => logs };
}

describe('WhatsApp durable send fence (simulated DB and transport)', () => {
  it('finalizes acceptance and one log; repeated processing never sends again', async () => {
    const f = fixture(); assert.equal((await f.execute()).outcome, 'accepted');
    assert.equal(f.state(), 'done'); assert.equal(f.logs(), 1);
    assert.equal((await f.execute()).outcome, 'not_owned'); assert.equal(f.sends(), 1);
  });
  it('records confirmed rejection without done or automatic retry', async () => {
    const f = fixture({ result: { ok: false, outcome: 'rejected' } });
    assert.equal((await f.execute()).outcome, 'rejected'); assert.equal(f.state(), 'delivery_rejected');
    await f.execute(); assert.equal(f.sends(), 1); assert.equal(f.logs(), 1);
  });
  it('does not send when the durable fence fails', async () => {
    const f = fixture({ fail: 'fence' }); await assert.rejects(f.execute()); assert.equal(f.sends(), 0);
  });
  for (const fail of ['send', 'log', 'finalize', 'lost_owner', 'commit_before', 'commit_after']) {
    it(`does not resend after ${fail}`, async () => {
      const f = fixture({ fail }); await f.execute(); await f.execute();
      assert.equal(f.sends(), 1);
      assert.ok(['delivery_unknown', 'done'].includes(f.state()));
      assert.equal(f.logs(), fail === 'commit_after' ? 1 : 0);
    });
  }
  it('quarantines an accepted response without message id', async () => {
    const f = fixture({ result: { ok: true } }); await f.execute();
    assert.equal(f.state(), 'delivery_unknown'); assert.equal(f.logs(), 0);
  });
  it('fences concurrent attempts on the same claimed row', async () => {
    const f = fixture(); await Promise.all([f.execute(), f.execute()]); assert.equal(f.sends(), 1);
  });
});

describe('Meta transport classification (no network)', () => {
  const call = fetcher => requestMetaMessage('https://example.invalid', 'dummy', {}, fetcher, 20);
  const response = (status, body) => async (_url, options) => {
    assert.equal(options.redirect, 'error'); assert.ok(options.signal);
    return { status, ok: status >= 200 && status < 300, json: async () => body };
  };
  it('requires an id on HTTP success', async () => {
    assert.equal((await call(response(200, { messages: [{ id: 'wamid.test' }] }))).ok, true);
    assert.equal((await call(response(200, {}))).outcome, 'unknown');
  });
  it('treats explicit 400 rejection as rejected without exposing raw errors', async () => {
    const r = await call(response(400, { error: { code: 190, message: 'secret-data' } }));
    assert.equal(r.outcome, 'rejected'); assert.ok(!JSON.stringify(r).includes('secret-data'));
  });
  for (const status of [408, 500, 503]) it(`holds HTTP ${status} for reconciliation`, async () => {
    assert.equal((await call(response(status, { error: { code: 1 } }))).outcome, 'unknown');
  });
  it('holds network failure without retry', async () => {
    let count = 0; const r = await call(async () => { count++; throw Error('network'); });
    assert.equal(r.outcome, 'unknown'); assert.equal(count, 1);
  });
  it('holds malformed JSON', async () => {
    assert.equal((await call(async () => ({ ok: true, json: async () => { throw Error(); } }))).outcome, 'unknown');
  });
  it('aborts an unresponsive request without retry', async () => {
    let count = 0;
    const r = await call((_url, options) => new Promise((_resolve, reject) => {
      count++;
      const timer = setTimeout(() => reject(Error('test deadline')), 200);
      options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(Error('aborted')); }, { once: true });
    }));
    assert.equal(r.outcome, 'unknown'); assert.equal(count, 1);
  });
});
