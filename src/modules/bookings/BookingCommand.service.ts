import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { idempotencyKeys } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { zonedDateTimeToUtcISOString } from "@/lib/time";
import { BookingService } from "./Booking.service";
import { BookingReminderPlannerService } from "@/modules/automation/BookingReminderPlanner.service";
import type { BookingCommandInput } from "./BookingCommand.schema";

type Result = Awaited<ReturnType<typeof BookingService.createAuto>>;
type Stored = { requestHash: string; status: string; responseJson: unknown };
type Dependencies = { find?: (companyId: string, key: string) => Promise<Stored | null>; claim?: (companyId: string, key: string, hash: string) => Promise<boolean>; complete?: (companyId: string, key: string, result: Result) => Promise<void>; create?: typeof BookingService.createAuto };
const scope = "booking.create";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function find(companyId: string, key: string) { const rows = await getDb().select({ requestHash: idempotencyKeys.requestHash, status: idempotencyKeys.status, responseJson: idempotencyKeys.responseJson }).from(idempotencyKeys).where(and(eq(idempotencyKeys.companyId, companyId), eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key))).limit(1); return rows[0] ?? null; }
async function claim(companyId: string, key: string, requestHash: string) { try { await getDb().insert(idempotencyKeys).values({ companyId, scope, key, requestHash, status: "processing", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }); return true; } catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return false; throw error; } }
async function complete(companyId: string, key: string, result: Result) { await getDb().update(idempotencyKeys).set({ status: "completed", responseJson: result, bookingId: result.ok ? result.booking.id : null, updatedAt: new Date() }).where(and(eq(idempotencyKeys.companyId, companyId), eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key))); }

export async function executeBookingCommand(context: { companyId: string; userId: string | null }, command: BookingCommandInput, dependencies: Dependencies = {}): Promise<Result | { ok: false; error: "idempotency_conflict" | "request_in_progress" | "invalid_start_time" }> {
  const startTime = zonedDateTimeToUtcISOString(command.date, command.time);
  if (!startTime) return { ok: false, error: "invalid_start_time" };
  const fingerprint = hash({ ...command, companyId: context.companyId }); const key = command.requestId;
  if (key) {
    const previous = await (dependencies.find ?? find)(context.companyId, key);
    if (previous) { if (previous.requestHash !== fingerprint) return { ok: false, error: "idempotency_conflict" }; if (previous.status === "completed") return previous.responseJson as Result; return { ok: false, error: "request_in_progress" }; }
    const acquired = await (dependencies.claim ?? claim)(context.companyId, key, fingerprint);
    if (!acquired) { const raced = await (dependencies.find ?? find)(context.companyId, key); if (raced?.requestHash === fingerprint && raced.status === "completed") return raced.responseJson as Result; return { ok: false, error: raced?.requestHash !== fingerprint ? "idempotency_conflict" : "request_in_progress" }; }
  }
  const result = await (dependencies.create ?? BookingService.createAuto)({ companyId: context.companyId, clientId: command.clientId, unitId: command.unitId || undefined, professionalId: command.professionalId || undefined, serviceId: command.serviceId, startTime, notes: command.notes || undefined, source: command.source, requestedBy: context.userId, requestId: key ?? null });
  if (key) await (dependencies.complete ?? complete)(context.companyId, key, result);
  if (result.ok) await BookingReminderPlannerService.planSafely({ companyId: context.companyId, bookingId: result.booking.id });
  return result;
}
