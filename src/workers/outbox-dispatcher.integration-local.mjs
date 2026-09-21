import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Tests the workspace proposal, NOT the deployed worker. Never imports its startup.
const { Client } = createRequire(new URL('../../package.json', import.meta.url))('pg');
const schema = `sisag_dispatch_test_${crypto.randomBytes(12).toString('hex')}`;
assert.match(schema, /^sisag_dispatch_test_[a-f0-9]{24}$/);
const config = { host: '127.0.0.1', port: 54322, database: 'postgres',
  user: 'postgres', password: 'postgres', ssl: false,
  connectionTimeoutMillis: 5000, query_timeout: 10000,
  application_name: 'sisag_dispatch_integration_simulated' };
const connections = [];
let owner, created = false, passed = false, stage = 'preflight';
function once(source, from, to) {
  assert.equal(source.split(from).length, 2, 'source anchor changed');
  return source.replace(from, to);
}
try {
  const [container] = JSON.parse(execFileSync('docker', ['--context', 'desktop-linux',
    'inspect', 'supabase_db_sisag-homolog-local'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(container.Name, '/supabase_db_sisag-homolog-local');
  assert.equal(container.State.Running, true);
  assert.ok(container.NetworkSettings.Ports['5432/tcp'].some(p => p.HostPort === '54322'));
  const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  let source = read('outbox-dispatcher.js');
  for (const line of [
    'import fs from "node:fs";', 'import crypto from "node:crypto";',
    'import { requestMetaMessage, dispatchWhatsAppSafely } from "./outbox-whatsapp-safety.mjs";',
    'import { Client } from "pg";',
    'import {\n  buildOutboxWebhookHeaders,\n  getOutboxWebhookConfig,\n  selectOutboxDestination,\n} from "./outbox-routing.mjs";',
  ]) source = once(source, line, '');
  // Only startup/dependencies and loop bound change; routing, SQL and handlers remain intact.
  source = once(source, 'while (true) {', 'for (let testCycle = 0; testCycle < 2; testCycle++) {');
  source = once(source, `main().catch((e) => {
  console.error("[dispatcher] fatal", e);
  process.exit(1);
});`, 'globalThis.runDispatcher = main;');
  const safety = read('outbox-whatsapp-safety.mjs').replaceAll('export async function ', 'async function ');
  const routing = fs.readFileSync(new URL('./outbox-routing.mjs', import.meta.url), 'utf8').replaceAll('export function ', 'function ');
  stage = 'estrutura isolada';
  owner = new Client(config); await owner.connect();
  await owner.query("SET statement_timeout TO '8s'");
  await owner.query(`CREATE SCHEMA "${schema}"`); created = true;
  console.log(`Estrutura exclusiva local: ${schema}`);
  await owner.query(`SET search_path TO "${schema}"`);
  await owner.query(`CREATE TABLE outbox (
    id uuid PRIMARY KEY, event_type text NOT NULL, payload jsonb NOT NULL,
    status text NOT NULL, attempts integer NOT NULL DEFAULT 0,
    locked_by text, locked_at timestamptz, next_retry_at timestamptz,
    last_error text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
    CHECK (NOT (payload->>'testCase'='fence_failure' AND status='delivery_unknown')))`);
  await owner.query(`CREATE TABLE message_logs (
    company_id uuid, outbox_id uuid UNIQUE REFERENCES outbox(id), channel text,
    provider text, to_phone text, body text CHECK (body <> 'log_failure'), status text,
    provider_message_id text, error text, response_payload jsonb,
    sent_at timestamptz, failed_at timestamptz, created_at timestamptz)`);
  const expected = {
    accepted: ['done', 1, 1], rejected: ['delivery_rejected', 1, 1],
    unknown: ['delivery_unknown', 1, 0], missing_id: ['delivery_unknown', 1, 0],
    log_failure: ['delivery_unknown', 1, 0], invalid_payload: ['delivery_rejected', 1, 0],
    fence_failure: ['processing', 0, 0], generic_ok: ['done', 0, 0],
    generic_failure: ['failed', 1, 0], exhausted: ['failed', 8, 0], future: ['failed', 0, 0],
  };
  for (const name of Object.keys(expected)) {
    const payload = { companyId: '11111111-1111-4111-8111-111111111111',
      toPhone: '00000000000', text: name, testCase: name };
    if (name === 'invalid_payload') delete payload.companyId;
    await owner.query(`INSERT INTO outbox(id,event_type,payload,status,attempts,next_retry_at)
      VALUES($1,$2,$3,$4,$5,CASE WHEN $6 THEN now()+interval '1 day' ELSE NULL END)`,
    [crypto.randomUUID(), name.startsWith('generic_') ? 'booking.created' : 'whatsapp.send.requested',
      JSON.stringify(payload), ['exhausted', 'future'].includes(name) ? 'failed' : 'pending',
      name === 'exhausted' ? 8 : 0, name === 'future']);
  }
  class LocalClient {
    constructor() { this.raw = new Client(config); connections.push(this.raw); }
    async connect() {
      await this.raw.connect();
      await this.raw.query("SET statement_timeout TO '5s'");
      await this.raw.query(`SET search_path TO "${schema}"`);
      const { rows: [r] } = await this.raw.query(`SELECT n.nspname FROM pg_class t
        JOIN pg_namespace n ON n.oid=t.relnamespace WHERE t.oid='outbox'::regclass`);
      assert.equal(r.nspname, schema);
    }
    query(...args) { return this.raw.query(...args); }
    end() { return this.raw.end(); }
  }
  const calls = {}, unexpected = [], workerErrors = [];
  const fakeFetch = async (url, options) => {
    const body = JSON.parse(options.body);
    let name;
    if (url === 'https://meta.invalid/v25.0/test/messages') name = body.text.body;
    else if (url === 'https://n8n.invalid/test') name = body.payload.testCase;
    else { unexpected.push('destination'); throw Error('unexpected simulated destination'); }
    calls[name] = (calls[name] || 0) + 1;
    if (['unknown', 'generic_failure'].includes(name)) throw Error('simulated connection failure');
    const data = name === 'rejected' ? { error: { code: 190 } }
      : name === 'missing_id' ? {} : { messages: [{ id: `simulated-${name}` }], ok: true };
    return { ok: name !== 'rejected', status: name === 'rejected' ? 400 : 200,
      json: async () => data, text: async () => JSON.stringify(data) };
  };
  const context = vm.createContext({
    Client: LocalClient, crypto, fetch: fakeFetch, AbortSignal, AbortController,
    setTimeout, clearTimeout,
    fs: { readFileSync() { throw Error('secret files disabled'); } },
    process: { env: {
      DATABASE_URL: 'postgres://unused-local-test', WHATSAPP_PROVIDER: 'meta',
      WA_API_BASE: 'https://meta.invalid', WA_GRAPH_VERSION: 'v25.0',
      WA_PHONE_NUMBER_ID: 'test', WA_CLOUD_TOKEN: 'dummy-not-a-token',
      N8N_WEBHOOK_URL: 'https://n8n.invalid/test', DISPATCH_BATCH_SIZE: '50',
      DISPATCH_INTERVAL_MS: '1', LOG_LEVEL: 'debug', WORKER_ID: 'isolated-integration',
    } },
    console: { log(...args) { if (args.includes('[dispatcher] loop error')) workerErrors.push('loop'); },
      warn() {}, error() {} },
  });
  stage = 'dispatcher com dependências substituídas';
  vm.runInContext(`${safety}\n${routing}\n${source}`, context, { timeout: 1000 });
  await context.runDispatcher();
  assert.deepEqual(unexpected, []); assert.deepEqual(workerErrors, []);
  stage = 'verificação de estados';
  const { rows } = await owner.query(`SELECT payload->>'testCase' AS name, status, attempts,
    (SELECT count(*)::int FROM message_logs m WHERE m.outbox_id=o.id) AS logs FROM outbox o`);
  assert.equal(rows.length, Object.keys(expected).length);
  for (const r of rows) {
    assert.deepEqual([r.status, r.attempts, r.logs], expected[r.name]);
    const expectedCalls = ['accepted','rejected','unknown','missing_id','log_failure','generic_ok','generic_failure'].includes(r.name) ? 1 : 0;
    assert.equal(calls[r.name] || 0, expectedCalls);
    console.log(`${r.name}: PASSOU; estado=${r.status}; logs=${r.logs}; chamadas simuladas=${expectedCalls}.`);
  }
  assert.equal((await owner.query(`SELECT count(*)::int AS n FROM message_logs
    WHERE status='sent' AND provider_message_id='simulated-accepted'`)).rows[0].n, 1);
  passed = true;
} catch {
  console.error(`TESTE INCOMPLETO/FALHOU: ${stage}. Detalhes brutos omitidos.`);
  process.exitCode = 1;
} finally {
  for (const c of connections) await c.end().catch(() => {});
  if (created) {
    try {
      await owner.query('ROLLBACK');
      await owner.query(`DROP TABLE IF EXISTS "${schema}".message_logs`);
      await owner.query(`DROP TABLE IF EXISTS "${schema}".outbox`);
      await owner.query(`DROP SCHEMA "${schema}" RESTRICT`);
      console.log('Estrutura descartável removida; nenhuma tabela pública utilizada.');
    } catch {
      console.error(`Limpeza incompleta: ${schema}. Não remova outros objetos.`);
      passed = false; process.exitCode = 1;
    }
  }
  if (owner) await owner.end().catch(() => {});
}
if (passed) {
  console.log('PASSOU: 11 cenários, seleção do lote, handlers e finalização da proposta, em duas iterações.');
  console.log('Transporte inteiramente simulado. Não certifica imagem Docker, schema real, queda de processo, rotas legadas ou produção.');
}
