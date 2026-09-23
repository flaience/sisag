import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const exports = {};
const forbidden = () => { throw new Error('Recovery attempted a side effect'); };
const dependencies = {
  'node:crypto': crypto,
  'drizzle-orm': {},
  '@/drizzle/schema': {},
  '@/lib/db': { getDb: forbidden },
  '@/lib/time': { zonedDateTimeToUtcISOString: () => '2026-10-01T14:00:00.000Z' },
  './Booking.service': { BookingService: { createAuto: forbidden } },
  '@/modules/automation/BookingReminderPlanner.service': { BookingReminderPlannerService: { planSafely: forbidden } },
};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('./BookingCommand.service.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; } });
const context = { companyId: 'company-a', userId: null };
const command = { clientId: 'client-a', unitId: 'unit-a', serviceId: 'service-a', professionalId: 'p2', date: '2026-10-01', time: '11:00', source: 'whatsapp', requestId: 'request-original' };
const requestHash = crypto.createHash('sha256').update(JSON.stringify({ ...command, companyId: context.companyId })).digest('hex');
const success = { ok: true, booking: { id: 'booking-a', companyId: 'company-a', clientId: 'client-a', startTime: '2026-10-01T14:00:00.000Z' } };
const completed = { requestHash, status: 'completed', responseJson: success };
for (const [name, record, expected] of [
  ['completed original', completed, 'completed'],
  ['absent request', null, 'unresolved'],
  ['still processing', { ...completed, status: 'processing' }, 'unresolved'],
  ['different fingerprint', { ...completed, requestHash: 'different' }, 'unresolved'],
  ['malformed result', { ...completed, responseJson: null }, 'unresolved'],
  ['another tenant', { ...completed, responseJson: { ...success, booking: { ...success.booking, companyId: 'company-b' } } }, 'unresolved'],
  ['another client', { ...completed, responseJson: { ...success, booking: { ...success.booking, clientId: 'client-b' } } }, 'unresolved'],
  ['another time', { ...completed, responseJson: { ...success, booking: { ...success.booking, startTime: '2026-10-01T15:00:00.000Z' } } }, 'unresolved'],
  ['known conflict', { ...completed, responseJson: { ok: false, error: 'slot_taken' } }, 'slot_taken'],
  ['uncertain failure', { ...completed, responseJson: { ok: false, error: 'internal_error' } }, 'unresolved'],
]) {
  test('read-only recovery: ' + name, async () => {
    let reads = 0;
    const result = await exports.readBookingCommandResult(context, command, { find: async (company, key) => {
      assert.equal(company, 'company-a'); assert.equal(key, 'request-original'); reads++; return record;
    } });
    assert.equal(result.state, expected); assert.equal(reads, 1);
    if (expected === 'completed') assert.equal(result.booking.id, 'booking-a');
  });
}
