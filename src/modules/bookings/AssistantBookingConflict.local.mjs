// Additional integration stage used only by the disposable local booking test.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const repositoryRoot=fileURLToPath(new URL('../../../',import.meta.url));
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
export async function runAssistantConflict({owner,schema,tables,require,company,unit,service,professional}) {
  assert.match(schema,/^sisag_booking_test_[a-f0-9]{24}$/);
  const q='"'+schema+'"', core=require('drizzle-orm/pg-core'), ns=core.pgSchema(schema);
  const text=core.text, time=n=>core.timestamp(n,{withTimezone:true});
  const pg=require('pg'), ts=require('typescript');
  const localUrl='postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable';
  const pools=[],tasks=[],cache=new Map();
  let phase='criação das tabelas auxiliares';
  const observedSqlStates=[];
  class DiagnosticClient extends pg.Client {
    query(...args) {
      const result=super.query(...args);
      if(result && typeof result.catch==='function')return result.catch(error=>{
        observedSqlStates.push(/^[0-9A-Z]{5}$/.test(error?.code??'')?error.code:'unclassified');
        throw error;
      });
      return result;
    }
  }
  let release, timer, arrivals=0, gateExpired=false, gateStarted=0;
  const arrivalTimes=[];
  const gate=new Promise(resolve=>{release=resolve;});
  const extended={...tables,
    conversationSessions:ns.table('sessions',{id:text('id').primaryKey(),companyId:text('company_id'),clientId:text('client_id'),status:text('status'),context:core.jsonb('context'),createdAt:time('created_at'),updatedAt:time('updated_at')}),
    schedulingConfig:ns.table('config',{companyId:text('company_id'),defaultUnitId:text('unit_id'),defaultServiceId:text('service_id'),defaultProfessionalId:text('professional_id'),timezone:text('timezone')}),
    idempotencyKeys:ns.table('commands',{companyId:text('company_id'),scope:text('scope'),key:text('key'),requestHash:text('request_hash'),status:text('status'),responseJson:core.jsonb('response_json'),bookingId:text('booking_id'),expiresAt:time('expires_at'),updatedAt:time('updated_at')}),
    outbox:ns.table('outbox',{id:text('id').primaryKey(),aggregateType:text('aggregate_type'),aggregateId:text('aggregate_id'),eventType:text('event_type'),payload:core.jsonb('payload'),status:text('status'),attempts:core.integer('attempts'),nextRetryAt:time('next_retry_at'),createdAt:time('created_at'),updatedAt:time('updated_at'),dedupeKey:text('dedupe_key')}),
  };
  const files={
    '@/lib/db':'src/lib/db.ts','@/lib/time':'src/lib/time.ts',
    '@/modules/bookings/BookingCommand.service':'src/modules/bookings/BookingCommand.service.ts',
    './Booking.service':'src/modules/bookings/Booking.service.ts',
    './BookingAllocationConflict':'src/modules/bookings/BookingAllocationConflict.ts',
    './Booking.state-contract':'src/modules/bookings/Booking.state-contract.ts',
    './whatsapp-core/sessions/ConversationSession.service':'src/modules/assistant/whatsapp-core/sessions/ConversationSession.service.ts',
    './ConversationSession.repository':'src/modules/assistant/whatsapp-core/sessions/ConversationSession.repository.ts',
    './whatsapp-core/composer/MessageComposer':'src/modules/assistant/whatsapp-core/composer/MessageComposer.ts',
    '@/infra/outbox/OutboxPublisher':'src/infra/outbox/OutboxPublisher.ts',
    './CommittedWhatsAppReply':'src/modules/assistant/CommittedWhatsAppReply.ts',
    assistant:'src/modules/assistant/AssistantWhatsApp.service.ts',
  };
  const deps={
    'drizzle-orm':require('drizzle-orm'),'drizzle-orm/node-postgres':require('drizzle-orm/node-postgres'),
    'node:crypto':crypto,crypto,uuid:{v4:crypto.randomUUID},'node:async_hooks':{AsyncLocalStorage},
    fs:{readFileSync(){throw new Error('Secret reading forbidden');}},
    '@/drizzle/schema':extended,'@/lib/logger':{logger:{debug(){},info(){}}},'@/lib/ui/actionResult':{},
    pg:{Pool:class extends pg.Pool {constructor(options){assert.equal(options.connectionString,localUrl);super({host:'127.0.0.1',port:54322,database:'postgres',user:'postgres',password:'postgres',ssl:false,max:4,Client:DiagnosticClient,connectionTimeoutMillis:5000,query_timeout:20000});pools.push(this);}}},
    '@/modules/clients/phone/normalizePhone':{normalizePhoneE164:v=>v},
    '@/modules/clients/ClientResolver.service':{ClientResolverService:class{async resolveOrCreate({phoneE164}){return{id:phoneE164};}}},
    './whatsapp-core/interpreter/interpretMessage':{interpretMessage:v=>({intent:v==='agendar'?'SCHEDULE_REQUEST':'UNKNOWN',slots:v==='agendar'?{dateIso:'2030-10-01',time:'09:00'}:{}})},
    '@/modules/availability/ServiceLedAvailability.service':{listServiceLedAvailability:async()=>({slots:[{startTime:'2030-10-01T14:00:00.000Z',professionalId:professional,professionalName:'SYNTHETIC'}]})},
    './BookingUnit.resolver':{resolveBookingUnit:async input=>{assert.equal(input.unitId,unit);arrivals++;arrivalTimes.push(Date.now()-gateStarted);if(arrivals===2){clearTimeout(timer);release();}await gate;assert.equal(gateExpired,false,'Synchronization deadline expired');assert.equal(arrivals,2);return unit;}},
    '@/modules/scheduling-config/ServiceBookingAssignment.engine':{resolveServiceBookingProfessional:async()=>{throw new Error('Explicit professional required');}},
    '@/modules/bookings/WhatsAppBookingLifecycle.service':{WhatsAppBookingLifecycleService:{}},
    '@/modules/automation/BookingReminderPlanner.service':{BookingReminderPlannerService:{planSafely:async()=>{}}},
  };
  for(const name of ['BookingRecoveryResponse','BookingFollowupFeedback','BookingReminderResponse'])deps['@/modules/automation/'+name+'.service']={[name+'Service']:{handle:async()=>({handled:false})}};
  function load(name){
    if(Object.hasOwn(deps,name))return deps[name];
    const file=files[name];assert.ok(file,'Unapproved module '+name);if(cache.has(file))return cache.get(file);
    const exports={};cache.set(file,exports);
    const compiled=ts.transpileModule(fs.readFileSync(repositoryRoot+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(compiled,{exports,require:load,process:{env:{DATABASE_URL:localUrl}},console:{error(){}},Intl,Date},{filename:file,timeout:5000});return exports;
  }
  const count=async table=>Number((await owner.query(`SELECT count(*)::int AS n FROM ${q}."${table}"`)).rows[0].n);
  try{
    await owner.query(`CREATE TABLE ${q}.sessions(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,company_id text,client_id text,status text,context jsonb,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE UNIQUE INDEX sessions_open ON ${q}.sessions(company_id,client_id) WHERE status='open';
    CREATE TABLE ${q}.config(company_id text,unit_id text,service_id text,professional_id text,timezone text);
    CREATE TABLE ${q}.commands(company_id text,scope text,key text,request_hash text,status text,response_json jsonb,booking_id text,expires_at timestamptz,updated_at timestamptz,UNIQUE(company_id,scope,key));
    CREATE TABLE ${q}.outbox(id text PRIMARY KEY,aggregate_type text,aggregate_id text,event_type text,payload jsonb,status text,attempts integer,next_retry_at timestamptz,created_at timestamptz,updated_at timestamptz,dedupe_key text UNIQUE);`);
    await owner.query(`INSERT INTO ${q}.config VALUES($1,$2,$3,$4,'America/Sao_Paulo')`,[company,unit,service,professional]);
    const people=[crypto.randomUUID(),crypto.randomUUID()],callbackIds=people.map(()=>crypto.randomUUID());
    const send=(phone,text,correlationId=crypto.randomUUID())=>load('assistant').AssistantWhatsAppService.handleInbound({companyId:company,phone,text,correlationId});
    const before=await count('bookings');
    for(let i=0;i<people.length;i++){
      const person=people[i];
      phase='oferta para cliente sintético '+(i+1);await send(person,'agendar');
      phase='escolha para cliente sintético '+(i+1);await send(person,'1');
      const saved=(await owner.query(`SELECT context FROM ${q}.sessions WHERE client_id=$1 AND status='open'`,[person])).rows[0];
      assert.ok(saved?.context?.pendingBookingDraft);
    }
    console.log('Assistant: duas propostas persistidas antes da confirmação.');
    assert.equal(await count('bookings'),before);
    phase='confirmações concorrentes e transações';
    gateStarted=Date.now();
    timer=setTimeout(()=>{gateExpired=true;release();},3500);
    for(let i=0;i<2;i++)tasks.push(send(people[i],'SIM',callbackIds[i]));
    await Promise.all(tasks);clearTimeout(timer);assert.equal(arrivals,2);
    console.log('Sincronização do teste: '+JSON.stringify({gateExpired,arrivalTimesMs:arrivalTimes}));
    phase='contagens de reservas e comandos';
    assert.equal(await count('bookings'),before+1);assert.equal(await count('commands'),2);
    phase='respostas persistidas para os dois callbacks';
    const replies=(await owner.query(`SELECT payload FROM ${q}.outbox WHERE payload->>'correlationId'=ANY($1::text[])`,[callbackIds])).rows.map(r=>r.payload);
    assert.equal(replies.length,2);
    assert.equal(replies.filter(p=>p.text.startsWith('Agendado')).length,1);
    const refused=replies.filter(p=>p.text.includes('indisponível'));assert.equal(refused.length,1);
    phase='sessão e resultado do cliente recusado';
    const loser=refused[0].toPhone;assert.ok(people.includes(loser));
    const state=(await owner.query(`SELECT context FROM ${q}.sessions WHERE client_id=$1 AND status='open'`,[loser])).rows[0];
    assert.ok(state);assert.equal(state.context.pendingBookingDraft,undefined);
    const commandResults=(await owner.query(`SELECT response_json FROM ${q}.commands WHERE status='completed'`)).rows.map(r=>r.response_json);
    assert.equal(commandResults.filter(r=>r.ok===true).length,1);assert.equal(commandResults.filter(r=>r.error==='slot_taken').length,1);
    console.log('Assistant + comando + criação reais: uma confirmação de agendamento e uma resposta de horário indisponível gravadas na outbox.');
    phase='callback repetido e novo SIM';
    const outboxBefore=await count('outbox');
    assert.equal((await send(loser,'SIM',callbackIds[people.indexOf(loser)])).replayed,true);
    assert.equal(await count('outbox'),outboxBefore);
    await send(loser,'SIM');
    assert.equal(await count('bookings'),before+1);assert.equal(await count('commands'),2);
    const falseSuccess=(await owner.query(`SELECT count(*)::int AS n FROM ${q}.outbox WHERE payload->>'toPhone'=$1 AND payload->>'text' LIKE 'Agendado%'`,[loser])).rows[0].n;
    assert.equal(falseSuccess,0);
    console.log('Cliente recusado: callback repetido não duplicou resposta; novo SIM não criou reserva nem confirmação falsa.');
    console.log('PASSOU: resposta persistida localmente, não entregue pelo WhatsApp. Catálogo, interpretação, cliente e unidade simulados; lembretes desativados.');
  }catch(error){
    console.error('Diagnóstico do assistant: '+JSON.stringify({phase,arrivals,gateExpired,arrivalTimesMs:arrivalTimes,assertion:error?.code==='ERR_ASSERTION',transactionFailure:error?.name==='ConversationTransactionError',sqlstates:[...new Set(observedSqlStates)]}));
    throw error;
  }finally{
    clearTimeout(timer);release();await Promise.allSettled(tasks);
    for(const pool of pools)await pool.end();
    for(const table of ['outbox','commands','config','sessions'])await owner.query(`DROP TABLE IF EXISTS ${q}."${table}"`);
    console.log('Quatro tabelas auxiliares do assistant removidas.');
  }
}
