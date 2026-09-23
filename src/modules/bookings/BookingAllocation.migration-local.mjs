// Isolated forward migration regression; NOT a BookingService or assistant test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const corrected = true;
const { Client } = createRequire(new URL('../../../package.json', import.meta.url))('pg');
const schema = 'sisag_overlap_test_' + crypto.randomBytes(12).toString('hex');
assert.match(schema, /^sisag_overlap_test_[a-f0-9]{24}$/);
const q = '"' + schema + '"';
const clients = [];
let created = false, stage = 'pré-condições', pending;
const local = { host: '127.0.0.1', port: 54322, database: 'postgres', user: 'postgres', password: 'postgres', ssl: false, connectionTimeoutMillis: 5000, query_timeout: 12000 };
const ids = Array.from({ length: 9 }, () => crypto.randomUUID());
const resource = crypto.randomUUID();
const insert = (client, item, selectedResource = resource) => client.query(`INSERT INTO ${q}.booking_item_allocations (id,booking_item_id,resource_id,start_time,end_time) VALUES ($1,$2,$3,'2030-10-01T13:00:00Z','2030-10-01T13:30:00Z')`, [crypto.randomUUID(), item, selectedResource]);
try {
 const migration = fs.readFileSync(new URL('../../drizzle/0016_booking_active_allocation_constraint.sql', import.meta.url));
 assert.equal(crypto.createHash('sha256').update(migration).digest('hex'), '220cff07bb56ae250f88266b3deadbcf4ab75fb8530c7243d84934a721fd09f0');
 const [container] = JSON.parse(execFileSync('docker', ['--context','desktop-linux','inspect','supabase_db_sisag-homolog-local'], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }));
 assert.equal(container.Name, '/supabase_db_sisag-homolog-local');
 assert.equal(container.State.Running,true);
 assert.ok(container.NetworkSettings.Ports['5432/tcp']?.some(p => p.HostPort === '54322'));
 for (let i=0;i<3;i++) { const c = new Client({...local,application_name:schema}); clients.push(c); await c.connect(); await c.query("SET statement_timeout='10s'"); }
 const [a,b,observer] = clients;
 const extension = (await a.query("SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='btree_gist'")).rows[0];
 assert.ok(extension, 'btree_gist não instalada; não será instalada por este teste');
 const extensionSchema = '"' + extension.nspname.replaceAll('"','""') + '"';
 stage = 'estrutura descartável';
 await a.query(`CREATE SCHEMA ${q}`); created=true;
 console.log('Estrutura descartável: '+schema);
 await a.query(`CREATE TABLE ${q}.bookings (id uuid PRIMARY KEY,status text NOT NULL);
 CREATE TABLE ${q}.booking_items (id uuid PRIMARY KEY,booking_id uuid REFERENCES ${q}.bookings(id));
 CREATE TABLE ${q}.booking_item_allocations (id uuid PRIMARY KEY,booking_item_id uuid REFERENCES ${q}.booking_items(id),resource_id uuid NOT NULL,start_time timestamptz NOT NULL,end_time timestamptz NOT NULL)`);
 // Same migration logic; redirect its explicit public references and search path only.
 const redirected = migration.toString().replaceAll('"public".', q+'.');
 assert.ok(!redirected.includes('"public".'));
 await a.query('BEGIN');
 await a.query(`SET LOCAL search_path TO ${q},pg_catalog,${extensionSchema}`);
 await a.query(redirected);
 await a.query('COMMIT');
 for (const id of ids) { await a.query(`INSERT INTO ${q}.bookings VALUES ($1,'PENDING')`,[id]); await a.query(`INSERT INTO ${q}.booking_items VALUES ($1,$1)`,[id]); }
 if (corrected) {
   stage='correção candidata e conflito histórico';
   const candidate=fs.readFileSync(fileURLToPath(new URL('../../drizzle/0021_booking_capacity_active_states.sql',import.meta.url)),'utf8').replaceAll('"public".',q+'.');
   assert.ok(!candidate.includes('"public".'));
   const historicalResource=crypto.randomUUID();
   for(const id of [ids[7],ids[8]]) {
     await a.query(`UPDATE ${q}.bookings SET status='ARRIVED' WHERE id=$1`,[id]);
     await insert(a,id,historicalResource);
   }
   await a.query('BEGIN');
   let conflictCode;
   try { await a.query(candidate); } catch(error) { conflictCode=error.code; }
   await a.query('ROLLBACK');
   assert.equal(conflictCode,'23P01');
   assert.equal((await a.query(`SELECT count(*)::int AS n FROM ${q}.booking_item_allocations WHERE blocks_schedule`)).rows[0].n,0);
   // Function changes must also have rolled back, not just the data backfill.
   await a.query(`UPDATE ${q}.bookings SET status='IN_PROGRESS' WHERE id=$1`,[ids[7]]);
   assert.equal((await a.query(`SELECT blocks_schedule FROM ${q}.booking_item_allocations WHERE booking_item_id=$1`,[ids[7]])).rows[0].blocks_schedule,false);
   console.log('Conflito histórico: correção recusada com 23P01; dados e funções revertidos juntos.');
   // Only this synthetic fixture is changed; no operational conflict is auto-resolved.
   await a.query(`UPDATE ${q}.bookings SET status='CANCELLED' WHERE id=$1`,[ids[8]]);
   await a.query('BEGIN'); await a.query(candidate); await a.query('COMMIT');
   assert.equal((await a.query(`SELECT blocks_schedule FROM ${q}.booking_item_allocations WHERE booking_item_id=$1`,[ids[7]])).rows[0].blocks_schedule,true);
   console.log('Correção candidata aplicada apenas na estrutura descartável; alocação antiga em atendimento voltou a bloquear.');
 }
 stage = 'disputa concorrente';
 const pid = (await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 await a.query('BEGIN'); await insert(a,ids[0]);
 await b.query('BEGIN');
 pending = insert(b,ids[1]).then(() => ({accepted:true}), e => ({code:e.code}));
 let blocked = false;
 for (let n=0;n<70;n++) {
   if ((await observer.query('SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked',[pid])).rows[0].blocked) { blocked=true; break; }
   await new Promise(resolve => setTimeout(resolve,40));
 }
 assert.equal(blocked,true);
 await a.query('COMMIT');
 assert.equal((await pending).code,'23P01'); await b.query('ROLLBACK');
 assert.equal((await a.query(`SELECT count(*)::int AS n FROM ${q}.booking_item_allocations WHERE resource_id=$1`,[resource])).rows[0].n,1);
 console.log('PENDING: segunda conexão aguardou e recebeu conflito 23P01; uma alocação preservada.');
 stage = 'cancelamento';
 await a.query(`UPDATE ${q}.bookings SET status='CANCELLED' WHERE id=$1`,[ids[0]]);
 await insert(a,ids[1]);
 assert.equal((await a.query(`SELECT blocks_schedule FROM ${q}.booking_item_allocations WHERE booking_item_id=$1`,[ids[0]])).rows[0].blocks_schedule,false);
 console.log('CANCELLED: gatilho liberou o recurso e a nova alocação foi aceita.');
 stage = 'estados em atendimento';
 for (const [index,status] of [[2,'ARRIVED'],[4,'IN_PROGRESS']]) {
   const ownResource=crypto.randomUUID();
   await insert(a,ids[index],ownResource);
   await a.query(`UPDATE ${q}.bookings SET status=$1 WHERE id=$2`,[status,ids[index]]);
   const blocking=(await a.query(`SELECT blocks_schedule FROM ${q}.booking_item_allocations WHERE booking_item_id=$1`,[ids[index]])).rows[0].blocks_schedule;
   assert.equal(blocking,corrected);
   if(corrected) {
     await assert.rejects(insert(a,ids[index+1],ownResource), error=>error.code==='23P01');
     console.log(status+': horário permaneceu bloqueado; sobreposição recusada.');
     const terminal=index===2?'NO_SHOW':'COMPLETED';
     await a.query(`UPDATE ${q}.bookings SET status=$1 WHERE id=$2`,[terminal,ids[index]]);
     await insert(a,ids[index+1],ownResource);
     console.log(terminal+': recurso liberado corretamente.');
   } else {
     await insert(a,ids[index+1],ownResource);
     console.log('LACUNA REPRODUZIDA: '+status+' deixou de bloquear; outra alocação no mesmo horário foi aceita.');
   }
 }
 console.log(corrected?'PASSOU: correção candidata nos cenários isolados; nenhuma migração instalada no SISAG.':'Caracterização concluída. NÃO é aprovação da regra: ARRIVED/IN_PROGRESS exigem correção.');
 console.log('Não testa BookingService, disponibilidade, assistant, HTTP, produção ou dados existentes.');
} catch (error) {
 console.error('TESTE INCOMPLETO/FALHOU: '+stage+'. Código: '+(/^[0-9A-Z]{5}$/.test(error?.code ?? '') ? error.code : 'não disponível')+'. Detalhes brutos omitidos.');
 process.exitCode=1;
} finally {
 for (const c of clients) await c.query('ROLLBACK').catch(()=>{});
 if(pending) await pending;
 if(created) {
   try {
     await clients[0].query(`DROP TABLE ${q}.booking_item_allocations; DROP TABLE ${q}.booking_items; DROP TABLE ${q}.bookings;
     DROP FUNCTION IF EXISTS ${q}.sync_allocation_blocking_on_write();
     DROP FUNCTION IF EXISTS ${q}.sync_booking_allocations_blocking_on_status(); DROP SCHEMA ${q}`);
     console.log('Três tabelas, duas funções e estrutura descartável removidas. Nenhuma tabela pública alterada.');
   } catch { console.error('Limpeza incompleta; preservar nome da estrutura: '+schema); process.exitCode=1; }
 }
 for(const c of clients) await c.end().catch(()=>{});
}
