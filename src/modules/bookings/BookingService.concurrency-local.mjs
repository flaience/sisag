// Actual BookingService + Drizzle + PostgreSQL; disposable reduced schema.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const repositoryRoot=fileURLToPath(new URL('../../../',import.meta.url));
process.argv.push('--resource-locks','--multiple-resources','--assistant');
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {Client}=require('pg'), ts=require('typescript'), orm=require('drizzle-orm'), core=require('drizzle-orm/pg-core');
const {drizzle}=require('drizzle-orm/node-postgres');
const schema='sisag_booking_test_'+crypto.randomBytes(12).toString('hex');
assert.match(schema,/^sisag_booking_test_[a-f0-9]{24}$/);
const q='"'+schema+'"', ns=core.pgSchema(schema), context=new AsyncLocalStorage();
const id=name=>core.uuid(name), str=name=>core.text(name), time=name=>core.timestamp(name,{withTimezone:true});
const tables={
 bookings:ns.table('bookings',{id:id('id').defaultRandom().primaryKey(),companyId:id('company_id'),clientId:id('client_id'),unitId:id('unit_id'),startTime:time('start_time'),status:str('status'),notes:str('notes'),source:str('source'),requestedBy:id('requested_by'),requestId:str('request_id')}),
 bookingItems:ns.table('booking_items',{id:id('id').defaultRandom().primaryKey(),bookingId:id('booking_id'),serviceId:id('service_id'),durationMinutes:core.integer('duration_minutes'),price:core.numeric('price'),startTime:time('start_time'),endTime:time('end_time')}),
 bookingItemAllocations:ns.table('booking_item_allocations',{id:id('id').defaultRandom().primaryKey(),bookingItemId:id('booking_item_id'),resourceId:id('resource_id'),startTime:time('start_time'),endTime:time('end_time')}),
 bookingEvents:ns.table('booking_events',{id:id('id').defaultRandom().primaryKey(),companyId:id('company_id'),bookingId:id('booking_id'),clientId:id('client_id'),type:str('type'),actor:str('actor'),payload:core.jsonb('payload')}),
 services:ns.table('services',{id:id('id'),durationMinutes:core.integer('duration_minutes')}),
 serviceRequirements:ns.table('service_requirements',{id:id('id'),serviceId:id('service_id'),resourceTypeId:id('resource_type_id'),quantity:core.integer('quantity')}),
 resources:ns.table('resources',{id:id('id'),typeId:id('type_id'),name:str('name')}),
 professionals:ns.table('professionals',{id:id('id'),companyId:id('company_id'),resourceId:id('resource_id')}),
};
const files={service:'src/modules/bookings/Booking.service.ts','./BookingAllocationConflict':'src/modules/bookings/BookingAllocationConflict.ts','./Booking.state-contract':'src/modules/bookings/Booking.state-contract.ts'};
const cache=new Map(), connections=[], sqlStates=[];
const lockTrace=[], deadlockEdges=[];
const resourceLockCalls=[];
const resourceLockKeys=[];
let tracing=false, traceSequence=0;
class TracedClient extends Client {
 query(...args){
   const raw=typeof args[0]==='string'?args[0]:args[0]?.text;
   if(this.traceWorker && typeof raw==='string' && /pg_advisory_xact_lock\(/i.test(raw)){
     resourceLockCalls.push(this.traceWorker);
     const params=Array.isArray(args[1])?args[1]:args[0]?.values;
     resourceLockKeys.push({worker:this.traceWorker,key:params?.[0]});
   }
   // Only operation labels, timestamps and backend IDs. Never SQL or parameters.
   let operation='other';
   if(typeof raw==='string'){
     const verb=/^\s*(select|insert|begin|commit|rollback|savepoint|release)\b/i.exec(raw)?.[1]?.toLowerCase();
     operation=verb??'other';
     if(verb==='insert'){
       const table=/^\s*insert\s+into\s+"sisag_booking_test_[a-f0-9]{24}"\."(bookings|booking_items|booking_item_allocations|booking_events)"/i.exec(raw)?.[1];
       operation=table?'insert '+table:'insert other';
     }
   }
   const record=tracing && this.traceWorker ? {sequence:++traceSequence,worker:this.traceWorker,pid:this.processID,operation,started:Date.now(),state:'running'}:null;
   if(record)lockTrace.push(record);
   const result=super.query(...args);
   if(result && typeof result.then==='function')return result.then(value=>{
     if(record){record.state='completed';record.elapsedMs=Date.now()-record.started;}
     return value;
   },error=>{
     if(record){record.state='failed';record.elapsedMs=Date.now()-record.started;record.sqlstate=/^[0-9A-Z]{5}$/.test(error?.code??'')?error.code:'unknown';}
     if(error?.code==='40P01' && typeof error.detail==='string'){
       for(const match of error.detail.matchAll(/Process (\d+) waits for ([A-Za-z]+) on transaction (\d+); blocked by process (\d+)/g)){
         deadlockEdges.push({waitingPid:Number(match[1]),lock:match[2],transaction:Number(match[3]),blockingPid:Number(match[4])});
       }
     }
     throw error;
   });
   return result;
 }
}
let created=false, stage='pré-condições', running=[], release, timeout;
const unit=crypto.randomUUID(), company=crypto.randomUUID(), service=crypto.randomUUID(), resource=crypto.randomUUID(), type=crypto.randomUUID(), professional=crypto.randomUUID();
let arrivals=0;
const barrier=new Promise(resolve=>{release=resolve;});
const mocks={
 'drizzle-orm':orm,'@/drizzle/schema':tables,'@/lib/db':{getDb:()=>{assert.ok(context.getStore());return context.getStore();}},
 './BookingUnit.resolver':{resolveBookingUnit:async input=>{assert.equal(input.unitId,unit);return unit;}},
 '@/modules/scheduling-config/ServiceBookingAssignment.engine':{resolveServiceBookingProfessional:async()=>{throw new Error('Explicit professional required');}},
 '@/modules/automation/BookingReminderPlanner.service':{BookingReminderPlannerService:{}},
};
function load(name){
 if(Object.hasOwn(mocks,name))return mocks[name];
 if(cache.has(name))return cache.get(name);
 assert.ok(files[name],'Unapproved module: '+name);
 const source=fs.readFileSync(repositoryRoot+files[name],'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};cache.set(name,module.exports);
 vm.runInNewContext(output,{module,exports:module.exports,require:load,console:{error(){},log(){}},Date,Set,Map},{filename:files[name],timeout:5000});
 return module.exports;
}
try{
 const [container]=JSON.parse(execFileSync('docker',['--context','desktop-linux','inspect','supabase_db_sisag-homolog-local'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 assert.equal(container.Name,'/supabase_db_sisag-homolog-local');assert.equal(container.State.Running,true);
 assert.ok(container.NetworkSettings.Ports['5432/tcp']?.some(p=>p.HostPort==='54322'));
 stage='conexões locais';
 for(let i=0;i<3;i++){
   const c=new TracedClient({host:'127.0.0.1',port:54322,database:'postgres',user:'postgres',password:'postgres',ssl:false,connectionTimeoutMillis:5000,query_timeout:15000,application_name:schema});
   c.traceWorker=i===0?null:i;
   connections.push(c);await c.connect();await c.query("SET statement_timeout='10s'");
 }
 const [owner,...workers]=connections;
 const ext=(await owner.query("SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='btree_gist'")).rows[0];assert.ok(ext,'btree_gist required');
 stage='estrutura isolada';
 await owner.query(`CREATE SCHEMA ${q}`);created=true;console.log('Estrutura descartável: '+schema);
 await owner.query(`CREATE TABLE ${q}.bookings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid,client_id uuid,unit_id uuid,start_time timestamptz,status text NOT NULL,notes text,source text,requested_by uuid,request_id text);
 CREATE TABLE ${q}.booking_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),booking_id uuid REFERENCES ${q}.bookings(id),service_id uuid,duration_minutes integer,price numeric,start_time timestamptz,end_time timestamptz);
 CREATE TABLE ${q}.booking_item_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),booking_item_id uuid REFERENCES ${q}.booking_items(id),resource_id uuid NOT NULL,start_time timestamptz NOT NULL,end_time timestamptz NOT NULL);
 CREATE TABLE ${q}.booking_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,booking_id uuid,client_id uuid,type text,actor text,payload jsonb);
 CREATE TABLE ${q}.services(id uuid PRIMARY KEY,duration_minutes integer);
 CREATE TABLE ${q}.service_requirements(id uuid PRIMARY KEY,service_id uuid,resource_type_id uuid,quantity integer);
 CREATE TABLE ${q}.resources(id uuid PRIMARY KEY,type_id uuid,name text);
 CREATE TABLE ${q}.professionals(id uuid PRIMARY KEY,company_id uuid,resource_id uuid);`);
 await owner.query('BEGIN');
 await owner.query(`SET LOCAL search_path TO ${q},pg_catalog,"${ext.nspname.replaceAll('"','""')}"`);
 for(const name of ['0016_booking_active_allocation_constraint.sql','0021_booking_capacity_active_states.sql']){
   const sql=fs.readFileSync(new URL('../../drizzle/'+name,import.meta.url),'utf8').replaceAll('"public".',q+'.');
   assert.ok(!sql.includes('"public".'));await owner.query(sql);
 }
 await owner.query('COMMIT');
 await owner.query(`INSERT INTO ${q}.services VALUES($1,30)`,[service]);
 await owner.query(`INSERT INTO ${q}.service_requirements VALUES($1,$2,$3,1)`,[crypto.randomUUID(),service,type]);
 await owner.query(`INSERT INTO ${q}.resources VALUES($1,$2,'SYNTHETIC')`,[resource,type]);
 await owner.query(`INSERT INTO ${q}.professionals VALUES($1,$2,$3)`,[professional,company,resource]);
 const {BookingService}=load('service');
 stage='duas reservas pelo serviço real';
 tracing=process.argv.includes('--diagnose-locks');
 // Synchronize only the start of each real transaction. Query results are real.
 timeout=setTimeout(()=>release(),5000);
 for(const worker of workers){
   const db=drizzle(worker);
   const transaction=async callback=>{
     arrivals++;if(arrivals===2)release();await barrier;
     assert.equal(arrivals,2,'Both calls must pass the precheck before insertion');
     try{return await db.transaction(callback);}catch(error){
       let cause=error;for(let n=0;n<8 && cause;n++,cause=cause.cause)if(cause.code){sqlStates.push(cause.code);break;}
       throw error;
     }
   };
   const wrapped=new Proxy(db,{get(target,key){if(key==='transaction')return transaction;const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
   const input={companyId:company,clientId:crypto.randomUUID(),unitId:unit,serviceId:service,professionalId:professional,startTime:'2030-10-01T13:00:00Z',source:'whatsapp'};
   running.push(context.run(wrapped,()=>BookingService.createAuto(input)));
 }
 const results=await Promise.all(running);clearTimeout(timeout);
 assert.equal(arrivals,2);assert.equal(results.filter(r=>r.ok===true).length,1);
 assert.equal(results.filter(r=>r.ok===false && r.error==='slot_taken').length,1);
 if(process.argv.includes('--resource-locks')){
   assert.deepEqual([...resourceLockCalls].sort(),[1,2]);
   assert.deepEqual(sqlStates,[]);
 }else assert.ok(sqlStates.includes('23P01'));
 const counts=(await owner.query(`SELECT (SELECT count(*)::int FROM ${q}.bookings) AS bookings,(SELECT count(*)::int FROM ${q}.booking_items) AS items,(SELECT count(*)::int FROM ${q}.booking_item_allocations) AS allocations,(SELECT count(*)::int FROM ${q}.booking_events) AS events`)).rows[0];
 assert.deepEqual(counts,{bookings:1,items:1,allocations:1,events:1});
 console.log('Duas chamadas passaram pela consulta inicial antes da gravação: SIM');
 console.log(process.argv.includes('--resource-locks')?'Ambas as conexões solicitaram o bloqueio do recurso; reconsulta retornou um slot_taken sem violação SQL.':'PostgreSQL recusou sobreposição com 23P01; serviço retornou uma aceitação e um slot_taken.');
 console.log('Uma reserva, um item, uma alocação e um evento; nenhuma gravação parcial da tentativa recusada.');
 console.log('PASSOU: criação e tratamento de conflito reais em PostgreSQL local. Unidade simulada, profissional explícito e schema reduzido.');
 console.log('Não valida disponibilidade, assistant, resposta ao cliente, HTTP, migrações em public ou produção.');
 if(process.argv.includes('--multiple-resources')){
   stage='dois recursos em ordem estável';
   const extraResource='00000000-0000-0000-0000-000000000000', extraType=crypto.randomUUID();
   assert.ok(extraResource<resource);
   await owner.query(`INSERT INTO ${q}.resources VALUES($1,$2,'SYNTHETIC SECOND RESOURCE')`,[extraResource,extraType]);
   await owner.query(`INSERT INTO ${q}.service_requirements VALUES($1,$2,$3,1)`,[crypto.randomUUID(),service,extraType]);
   const keysBefore=resourceLockKeys.length;
   let ready=0, open;
   const gate=new Promise(resolve=>{open=resolve;});
   const deadline=setTimeout(()=>open(),5000);
   const secondRace=[];
   try{
     for(const worker of workers){
       const db=drizzle(worker);
       const transaction=async callback=>{
         ready++;if(ready===2){clearTimeout(deadline);open();}await gate;assert.equal(ready,2);
         return db.transaction(callback);
       };
       const wrapped=new Proxy(db,{get(target,key){if(key==='transaction')return transaction;const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
       const task=context.run(wrapped,()=>BookingService.createAuto({companyId:company,clientId:crypto.randomUUID(),unitId:unit,serviceId:service,professionalId:professional,startTime:'2030-10-01T15:00:00Z',source:'whatsapp'}));
       secondRace.push(task);running.push(task);
     }
     const results=await Promise.all(secondRace);
     assert.equal(ready,2);assert.equal(results.filter(r=>r.ok===true).length,1);
     assert.equal(results.filter(r=>r.ok===false && r.error==='slot_taken').length,1);
     for(const worker of [1,2])assert.deepEqual(resourceLockKeys.slice(keysBefore).filter(r=>r.worker===worker).map(r=>r.key),[extraResource,resource]);
     const totals=(await owner.query(`SELECT (SELECT count(*)::int FROM ${q}.bookings) AS bookings,(SELECT count(*)::int FROM ${q}.booking_items) AS items,(SELECT count(*)::int FROM ${q}.booking_item_allocations) AS allocations,(SELECT count(*)::int FROM ${q}.booking_events) AS events`)).rows[0];
     assert.deepEqual(totals,{bookings:2,items:2,allocations:3,events:2});
     console.log('Dois recursos: ambas as conexões bloquearam na mesma ordem, inversa à seleção; uma nova reserva e duas alocações.');
   }finally{clearTimeout(deadline);open();await Promise.allSettled(secondRace);}
 }
 if(process.argv.includes('--assistant')){
   stage='assistant integrado ao conflito real';
   const {runAssistantConflict}=await import('./AssistantBookingConflict.local.mjs');
   await runAssistantConflict({owner,schema,tables,require,company,unit,service,professional});
 }
}catch(error){
 console.error('TESTE INCOMPLETO/FALHOU: '+stage+'. SQLSTATE observados: '+(sqlStates.join(',')||'nenhum')+'. Detalhes brutos omitidos.');process.exitCode=1;
}finally{
 clearTimeout(timeout);release();await Promise.allSettled(running);
 tracing=false;
 if(process.argv.includes('--diagnose-locks')){
   console.log('Operações das duas conexões (sem SQL ou parâmetros):');
   console.table(lockTrace.map(({started,...record})=>record));
   console.log('Dependências do deadlock informadas pelo PostgreSQL:');
   console.table(deadlockEdges);
 }
 for(const c of connections)await c.query('ROLLBACK').catch(()=>{});
 if(created)try{
   await connections[0].query(`DROP TABLE ${q}.booking_events; DROP TABLE ${q}.booking_item_allocations; DROP TABLE ${q}.booking_items; DROP TABLE ${q}.bookings; DROP TABLE ${q}.professionals; DROP TABLE ${q}.resources; DROP TABLE ${q}.service_requirements; DROP TABLE ${q}.services; DROP FUNCTION IF EXISTS ${q}.sync_allocation_blocking_on_write(); DROP FUNCTION IF EXISTS ${q}.sync_booking_allocations_blocking_on_status(); DROP SCHEMA ${q}`);
   console.log('Oito tabelas, duas funções e estrutura descartável removidas. Nenhuma tabela pública alterada.');
 }catch{console.error('Limpeza incompleta: '+schema);process.exitCode=1;}
 for(const c of connections)await c.end().catch(()=>{});
}
