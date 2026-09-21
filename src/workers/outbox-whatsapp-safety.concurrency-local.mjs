import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { dispatchWhatsAppSafely } from './outbox-whatsapp-safety.mjs';

const { Client } = createRequire(new URL('../../package.json', import.meta.url))('pg');
const schema = `sisag_safety_test_${randomBytes(12).toString('hex')}`;
assert.match(schema, /^sisag_safety_test_[a-f0-9]{24}$/);
const clients = [];
let owner, created = false, work = [], stage = 'docker local', passed = false;
try {
  const [container] = JSON.parse(execFileSync('docker', ['--context', 'desktop-linux',
    'inspect', 'supabase_db_sisag-homolog-local'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(container.Name, '/supabase_db_sisag-homolog-local');
  assert.equal(container.State.Running, true);
  assert.ok(container.NetworkSettings.Ports['5432/tcp'].some(p => p.HostPort === '54322'));
  stage = 'conexões locais';
  for (let i = 0; i < 3; i++) {
    // Fixed loopback configuration; no DATABASE_URL or production secrets.
    const c = new Client({ host: '127.0.0.1', port: 54322, database: 'postgres',
      user: 'postgres', password: 'postgres', ssl: false,
      connectionTimeoutMillis: 5000, query_timeout: 12000,
      application_name: `sisag_safety_concurrency_${i}` });
    clients.push(c); await c.connect();
    await c.query("SET statement_timeout TO '10s'");
    await c.query("SET lock_timeout TO '8s'");
    await c.query(`SET search_path TO "${schema}"`);
  }
  [owner] = clients;
  stage = 'estrutura descartável';
  await owner.query(`CREATE SCHEMA "${schema}"`); created = true;
  console.log(`Estrutura exclusiva local: ${schema}`);
  await owner.query(`CREATE TABLE "${schema}".outbox (
    id text PRIMARY KEY, status text NOT NULL, attempts integer NOT NULL DEFAULT 0,
    locked_by text, locked_at timestamptz, next_retry_at timestamptz,
    last_error text, updated_at timestamptz DEFAULT now())`);
  await owner.query(`CREATE TABLE "${schema}".safety_logs (
    outbox_id text UNIQUE REFERENCES "${schema}".outbox(id), status text NOT NULL)`);
  for (const c of clients) {
    const { rows: [r] } = await c.query(`SELECT n.nspname FROM pg_class t
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE t.oid='outbox'::regclass`);
    assert.equal(r.nspname, schema);
  }
  await owner.query("INSERT INTO outbox(id,status,locked_by) VALUES('exclusive','processing','same-claim')");
  const pids = [];
  for (const c of clients.slice(1)) pids.push((await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
  stage = 'disputa controlada';
  await owner.query('BEGIN');
  await owner.query("SELECT id FROM outbox WHERE id='exclusive' FOR UPDATE");
  let sends = 0;
  work = clients.slice(1).map(c => dispatchWhatsAppSafely({
    client: c, row: { id: 'exclusive' }, workerId: 'same-claim',
    send: async () => { sends++; return { ok: true, providerMessageId: 'simulated-only' }; },
    writeLog: async (_result, status) => {
      await c.query('INSERT INTO safety_logs VALUES($1,$2)', ['exclusive', status]);
    },
  }).then(value => ({ value }), () => ({ failed: true })));
  // Prove both independent sessions are waiting on locks before releasing.
  let blocked = false;
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const { rows: [r] } = await owner.query(`SELECT count(*)::int AS n
      FROM unnest($1::int[]) AS p(pid) WHERE cardinality(pg_blocking_pids(p.pid)) > 0`, [pids]);
    if (r.n === 2) { blocked = true; break; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(blocked, true);
  console.log('Duas conexões aguardando bloqueio antes da disputa: SIM');
  await owner.query('COMMIT');
  const results = await Promise.all(work);
  assert.ok(results.every(r => !r.failed));
  assert.deepEqual(results.map(r => r.value.outcome).sort(), ['accepted', 'not_owned']);
  assert.equal(sends, 1);
  const { rows: [state] } = await owner.query(`SELECT status, attempts,
    (SELECT count(*)::int FROM safety_logs) AS logs FROM outbox WHERE id='exclusive'`);
  assert.deepEqual(state, { status: 'done', attempts: 1, logs: 1 });
  console.log('Uma aceitação e uma tentativa sem posse: SIM');
  console.log('Estado done; tentativas=1; logs=1; chamadas ao envio simulado=1.');
  passed = true;
} catch {
  console.error(`TESTE INCOMPLETO/FALHOU na etapa: ${stage}. Nenhuma chamada HTTP configurada.`);
  process.exitCode = 1;
} finally {
  if (owner) await owner.query('ROLLBACK').catch(() => {});
  await Promise.allSettled(work);
  for (const c of clients.slice(1)) await c.end().catch(() => {});
  if (created) {
    try {
      // Only this run's random schema; no CASCADE and no public objects.
      await owner.query(`DROP TABLE IF EXISTS "${schema}".safety_logs`);
      await owner.query(`DROP TABLE IF EXISTS "${schema}".outbox`);
      await owner.query(`DROP SCHEMA "${schema}" RESTRICT`);
      console.log('Duas tabelas descartáveis e estrutura exclusiva removidas; dados do SISAG não utilizados.');
    } catch {
      console.error(`Limpeza incompleta: ${schema}. Não remova outros objetos.`);
      process.exitCode = 1; passed = false;
    }
  }
  if (owner) await owner.end().catch(() => {});
  else for (const c of clients) await c.end().catch(() => {});
}
if (passed) {
  console.log('PASSOU: concorrência local na proteção de envio sobre a mesma posse de evento.');
  console.log('Não valida seleção do lote, dispatcher completo, consumidores legados, queda real, schema público ou produção.');
}
