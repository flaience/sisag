import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dispatchWhatsAppSafely } from './outbox-whatsapp-safety.mjs';

// Deliberately ignores DATABASE_URL and production configuration.
const require = createRequire(new URL('../../package.json', import.meta.url));
const { Client } = require('pg');
let client;
try {
  const raw = execFileSync('docker', ['--context', 'desktop-linux', 'inspect',
    'supabase_db_sisag-homolog-local'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const [container] = JSON.parse(raw);
  assert.equal(container.Name, '/supabase_db_sisag-homolog-local');
  assert.equal(container.State.Running, true);
  assert.ok(container.NetworkSettings.Ports['5432/tcp'].some(p => p.HostPort === '54322'));
  client = new Client({ host: '127.0.0.1', port: 54322, user: 'postgres',
    password: 'postgres', database: 'postgres', ssl: false,
    connectionTimeoutMillis: 5000, query_timeout: 8000,
    application_name: 'sisag_offline_outbox_safety_test' });
  await client.connect();
  await client.query("SET search_path TO pg_temp");
  await client.query("SET statement_timeout TO '5s'");
  await client.query("SET lock_timeout TO '2s'");
  await client.query(`CREATE TEMP TABLE outbox (
    id text PRIMARY KEY, status text NOT NULL, attempts integer NOT NULL DEFAULT 0,
    locked_by text, locked_at timestamptz, next_retry_at timestamptz,
    last_error text, updated_at timestamptz DEFAULT now())`);
  await client.query(`CREATE TEMP TABLE safety_logs (
    outbox_id text UNIQUE REFERENCES outbox(id), status text NOT NULL)`);
  const { rows: [identity] } = await client.query(`SELECT
    'outbox'::regclass::oid = 'pg_temp.outbox'::regclass::oid AS isolated,
    pg_my_temp_schema() = (SELECT relnamespace FROM pg_class WHERE oid='outbox'::regclass) AS temporary`);
  assert.equal(identity.isolated, true);
  assert.equal(identity.temporary, true);
  console.log('PostgreSQL local confirmado; somente duas tabelas temporárias desta conexão.');

  const scenarios = [
    ['accepted', { ok: true, providerMessageId: 'simulated-id' }, 'done', 1],
    ['rejected', { ok: false, outcome: 'rejected' }, 'delivery_rejected', 1],
    ['unknown', { ok: false, outcome: 'unknown' }, 'delivery_unknown', 0],
    ['missing_id', { ok: true }, 'delivery_unknown', 0],
    ['log_failure', { ok: true, providerMessageId: 'simulated-id' }, 'delivery_unknown', 0],
  ];
  for (const [id, result, expected, logCount] of scenarios) {
    await client.query("INSERT INTO pg_temp.outbox(id,status,locked_by,locked_at) VALUES($1,'processing','local-test',now())", [id]);
    let sends = 0;
    const run = () => dispatchWhatsAppSafely({ client, row: { id }, workerId: 'local-test',
      send: async () => { sends++; return result; },
      writeLog: async (_result, status) => {
        await client.query('INSERT INTO pg_temp.safety_logs VALUES($1,$2)', [id, status]);
        if (id === 'log_failure') await client.query('SELECT 1/0');
      },
    });
    const first = await run();
    if (id === 'log_failure') assert.equal(first.outcome, 'persistence_uncertain');
    assert.equal((await run()).outcome, 'not_owned');
    assert.equal(sends, 1);
    const { rows: [state] } = await client.query(`SELECT status, attempts,
      (SELECT count(*)::int FROM pg_temp.safety_logs WHERE outbox_id=$1) AS logs
      FROM pg_temp.outbox WHERE id=$1`, [id]);
    assert.equal(state.status, expected);
    assert.equal(state.attempts, 1);
    assert.equal(state.logs, logCount);
    console.log(`${id}: PASSOU; estado=${state.status}; logs=${state.logs}; envio simulado=1.`);
  }
  console.log('PASSOU: cinco cenários com PostgreSQL real e transporte substituído. Nenhuma chamada HTTP.');
  console.log('Não valida concorrência entre conexões, queda real do processo, schema público ou produção.');
} catch {
  console.error('TESTE INCOMPLETO/FALHOU. Detalhes brutos omitidos. Nenhum transporte real foi configurado.');
  process.exitCode = 1;
} finally {
  if (client) await client.end().catch(() => {});
  // Session termination removes temporary tables; no DROP against existing data.
}
