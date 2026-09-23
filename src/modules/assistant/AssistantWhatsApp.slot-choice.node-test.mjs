import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';


const require = createRequire(import.meta.url);
const ts = require('typescript');
const original = readFileSync(new URL('./AssistantWhatsApp.service.ts', import.meta.url), 'utf8');
const realTime = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../lib/time.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: realTime, Intl, Date });
const slots = [
  { startTime: '2026-10-01T13:00:00.000Z', professionalId: 'p1', professionalName: 'Profissional 1' },
  { startTime: '2026-10-01T14:00:00.000Z', professionalId: 'p2', professionalName: 'Profissional 2' },
];

function harness(source, preferred = null) {
  let session = null;
  let clock = Date.parse('2026-09-22T12:00:00Z');
  let bookingError = null;
  let recoveredResult = { state: "unresolved" };
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const replies = [], bookings = [];
  const defaults = { unitId: 'unit-a', serviceId: 'service-a', professionalId: preferred, timezone: 'America/Sao_Paulo' };
  const exports = {};
  const dependencies = {
    "./CommittedWhatsAppReply": { hasCommittedWhatsAppReply: async () => false },
    '@/infra/outbox/OutboxPublisher': { OutboxPublisher: { publish: async value => { replies.push(value); return { id: 'simulated' }; } } },
    './whatsapp-core/interpreter/interpretMessage': { interpretMessage: text => ({ intent: text === 'agendar' ? 'SCHEDULE_REQUEST' : 'UNKNOWN', slots: text === 'agendar' ? { dateIso: '2026-10-01', time: '09:00' } : text === 'outro dia' ? { dateIso: '2026-10-02' } : /^\d$/.test(text) ? { time: '02:00' } : {} }) },
    '@/modules/clients/phone/normalizePhone': { normalizePhoneE164: value => value },
    '@/modules/clients/ClientResolver.service': { ClientResolverService: class { async resolveOrCreate() { return { id: 'client-a' }; } } },
    './whatsapp-core/sessions/ConversationSession.service': { ConversationSessionService: class {
      async getOpen() { return session; }
      async openOrUpdate(company, client, context) { assert.equal(company, 'company-a'); assert.equal(client, 'client-a'); session = { id: 'session', context: structuredClone(context) }; }
      async close() { session = null; }
    } },
    './whatsapp-core/composer/MessageComposer': { MessageComposer: class { unknown() { return 'unknown'; } askMissingDateTime() { return 'missing'; } } },
    '@/lib/logger': { logger: { debug() {} } },
    '@/lib/db': { withConversationTransaction: async (company, phone, callback) => { assert.equal(company, 'company-a'); assert.equal(phone, 'TEST-NO-SEND'); return callback(); }, getDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [defaults] }) }) }) }) },
    '@/drizzle/schema': { schedulingConfig: {} },
    'drizzle-orm': { eq() {} },
    '@/modules/availability/ServiceLedAvailability.service': { listServiceLedAvailability: async () => ({ slots }) },
    '@/modules/bookings/BookingCommand.service': { readBookingCommandResult: async () => recoveredResult, executeBookingCommand: async (context, command) => { bookings.push({ context, command }); return bookingError ? { error: bookingError } : { booking: { id: 'booking-a', startTime: '2026-10-01T14:00:00.000Z' } }; } },
    '@/lib/ui/actionResult': {},
    '@/modules/bookings/WhatsAppBookingLifecycle.service': { WhatsAppBookingLifecycleService: {} },
    '@/lib/time': realTime,
    crypto,
  };
  for (const name of ['BookingReminderResponse', 'BookingFollowupFeedback', 'BookingRecoveryResponse']) {
    dependencies['@/modules/automation/' + name + '.service'] = { [name + 'Service']: { handle: async () => ({ handled: false }) } };
  }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name); return dependencies[name]; }, Intl, Date: TestDate });
  return {
    send: text => exports.AssistantWhatsAppService.handleInbound({ companyId: 'company-a', phone: 'TEST-NO-SEND', text, correlationId: crypto.randomUUID() }),
    replies, bookings, context: () => session?.context,
    advance: milliseconds => { clock += milliseconds; },
    rejectBooking: error => { bookingError = error; },
    setTimezone: timezone => { defaults.timezone = timezone; },
    recover: result => { recoveredResult = result; },
  };
}



for (const choice of ['2', 'o segundo']) {
  test('integrated source: offer -> ' + choice + ' -> explicit confirmation -> official booking command', async () => {
    const h = harness(original);
    await h.send('agendar');
    assert.equal(h.context().pendingBookingOptions.options.length, 2);
    await h.send(choice);
    assert.equal(h.bookings.length, 0);
    assert.equal(h.context().pendingBookingDraft.professionalId, 'p2');
    assert.equal(h.context().pendingBookingDraft.time, '11:00');
    assert.equal(h.context().pendingBookingOptions, undefined);
    await h.send('SIM');
    assert.equal(h.bookings.length, 1);
    assert.equal(h.bookings[0].context.companyId, 'company-a');
    assert.equal(h.bookings[0].command.clientId, 'client-a');
    assert.equal(h.bookings[0].command.professionalId, 'p2');
    assert.match(h.replies.at(-1).payload.text, /booking-a/);
    assert.equal(h.replies.at(-1).eventType, 'whatsapp.send.requested');
  });
}

test('integrated source: nonexistent option never books or changes proposal', async () => {
  const h = harness(original);
  await h.send('agendar');
  await h.send('3');
  assert.equal(h.bookings.length, 0);
  assert.equal(h.context().pendingBookingDraft, undefined);
  assert.equal(h.context().pendingBookingOptions.options.length, 2);
});

test('integrated source: negative confirmation never books', async () => {
  const h = harness(original);
  await h.send('agendar'); await h.send('2'); await h.send('NÃO');
  assert.equal(h.bookings.length, 0);
  assert.equal(h.context(), undefined);
});

test('integrated source: configured professional restricts suggested options', async () => {
  const h = harness(original, 'p1');
  await h.send('agendar');
  assert.equal(h.context().pendingBookingOptions.options.length, 1);
  assert.equal(h.context().pendingBookingOptions.options[0].professionalId, 'p1');
});



test('integrated source: expired offer cannot become a booking draft', async () => {
  const h = harness(original);
  await h.send('agendar'); h.advance(15 * 60 * 1000); await h.send('2');
  assert.equal(h.bookings.length, 0);
  assert.equal(h.context().pendingBookingOptions, undefined);
  assert.equal(h.context().pendingBookingDraft, undefined);
  assert.match(h.replies.at(-1).payload.text, /venceram/);
});

test('integrated source: selecting an option does not renew its expiration', async () => {
  const h = harness(original);
  await h.send('agendar'); h.advance(14 * 60 * 1000); await h.send('2');
  h.advance(60 * 1000); await h.send('SIM');
  assert.equal(h.bookings.length, 0);
  assert.equal(h.context().pendingBookingDraft, undefined);
  assert.match(h.replies.at(-1).payload.text, /venceu/);
});

for (const afterChoice of [false, true]) {
  test('integrated source: recognized date correction clears old ' + (afterChoice ? 'draft' : 'options'), async () => {
    const h = harness(original);
    await h.send('agendar'); if (afterChoice) await h.send('2');
    await h.send('outro dia');
    assert.equal(h.context().pending.dateIso, '2026-10-02');
    assert.equal(h.context().pendingBookingDraft, undefined);
    assert.equal(h.context().pendingBookingOptions, undefined);
    await h.send('SIM');
    assert.equal(h.bookings.length, 0);
  });
}

test('integrated source: slot_taken never reports success or retries on repeated SIM', async () => {
  const h = harness(original);
  await h.send('agendar'); await h.send('2'); h.rejectBooking('slot_taken');
  await h.send('SIM');
  assert.equal(h.bookings.length, 1);
  assert.match(h.replies.at(-1).payload.text, /indisponível/);
  assert.equal(h.context().pendingBookingDraft, undefined);
  await h.send('SIM');
  assert.equal(h.bookings.length, 1);
  assert.ok(h.replies.every(reply => !reply.payload.text.includes('Agendado ✅')));
});

test('integrated source: unfinished command preserves the same request identity', async () => {
  const h = harness(original);
  await h.send('agendar'); await h.send('2');
  const requestId = h.context().pendingBookingDraft.requestId;
  h.rejectBooking('request_in_progress'); await h.send('SIM');
  assert.equal(h.context().pendingBookingDraft.requestId, requestId);
  assert.match(h.replies.at(-1).payload.text, /em processamento/);
  assert.ok(!h.replies.at(-1).payload.text.includes('Agendado ✅'));
  await h.send('SIM');
  assert.equal(h.bookings.length, 1);
  assert.ok(h.bookings.every(call => call.command.requestId === requestId));
});

test('integrated source: pending confirmation survives expiry, date correction and cancellation', async () => {
  const h = harness(original);
  await h.send('agendar'); await h.send('2');
  const requestId = h.context().pendingBookingDraft.requestId;
  h.rejectBooking('request_in_progress'); await h.send('SIM');
  h.advance(30 * 60 * 1000);
  for (const message of ['SIM', 'outro dia', 'NÃO', 'agendar']) {
    await h.send(message);
    assert.equal(h.context().pendingBookingDraft.requestId, requestId);
    assert.equal(h.bookings.length, 1);
    assert.match(h.replies.at(-1).payload.text, /precisa ser verificada/);
  }
});

test('integrated source: real time conversion blocks a different booking instant', async () => {
  const h = harness(original);
  h.setTimezone('America/Manaus');
  await h.send('agendar'); await h.send('2'); await h.send('SIM');
  assert.equal(h.bookings.length, 0);
  assert.match(h.replies.at(-1).payload.text, /divergência de fuso/);
});

test('integrated source: completed pending result is recovered without executing again', async () => {
  const h = harness(original);
  await h.send('agendar'); await h.send('2'); h.rejectBooking('request_in_progress'); await h.send('SIM');
  h.advance(30 * 60 * 1000);
  h.recover({ state: 'completed', booking: { id: 'original-booking', startTime: '2026-10-01T14:00:00.000Z' } });
  await h.send('SIM');
  assert.equal(h.bookings.length, 1); assert.equal(h.context(), undefined);
  assert.match(h.replies.at(-1).payload.text, /original-booking/);
});
test('integrated source: recovered conflict releases the draft without a new booking', async () => {
  const h = harness(original);
  await h.send('agendar'); await h.send('2'); h.rejectBooking('request_in_progress'); await h.send('SIM');
  h.recover({ state: 'slot_taken' }); await h.send('SIM');
  assert.equal(h.bookings.length, 1); assert.equal(h.context().pendingBookingDraft, undefined);
  assert.match(h.replies.at(-1).payload.text, /recusada/);
});
