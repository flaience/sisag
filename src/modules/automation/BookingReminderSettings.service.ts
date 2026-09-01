import { eq } from "drizzle-orm";
import { automationRules } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingReminderSettingsSchema, DEFAULT_BOOKING_REMINDER_TEMPLATE, type BookingReminderSettings } from "./BookingReminderSettings.schema";

function view(row?: { enablePrecheckin: boolean; precheckinHoursBefore: number; templates: unknown } | null): BookingReminderSettings {
  const templates = row?.templates && typeof row.templates === "object" ? row.templates as Record<string, unknown> : {};
  return { enabled: row?.enablePrecheckin ?? false, hoursBefore: row?.precheckinHoursBefore ?? 24, template: typeof templates.bookingReminder === "string" ? templates.bookingReminder : DEFAULT_BOOKING_REMINDER_TEMPLATE };
}
export class BookingReminderSettingsService {
  static async get(companyId: string) { const rows = await getDb().select({ enablePrecheckin: automationRules.enablePrecheckin, precheckinHoursBefore: automationRules.precheckinHoursBefore, templates: automationRules.templates }).from(automationRules).where(eq(automationRules.companyId, companyId)).limit(1); return view(rows[0]); }
  static async save(companyId: string, input: unknown) {
    const settings = BookingReminderSettingsSchema.parse(input); const db = getDb();
    const current = await db.select({ templates: automationRules.templates }).from(automationRules).where(eq(automationRules.companyId, companyId)).limit(1);
    const templates = current[0]?.templates && typeof current[0].templates === "object" ? current[0].templates as Record<string, unknown> : {};
    const rows = await db.insert(automationRules).values({ companyId, enablePrecheckin: settings.enabled, precheckinHoursBefore: settings.hoursBefore, templates: { ...templates, bookingReminder: settings.template } }).onConflictDoUpdate({ target: automationRules.companyId, set: { enablePrecheckin: settings.enabled, precheckinHoursBefore: settings.hoursBefore, templates: { ...templates, bookingReminder: settings.template }, updatedAt: new Date() } }).returning({ enablePrecheckin: automationRules.enablePrecheckin, precheckinHoursBefore: automationRules.precheckinHoursBefore, templates: automationRules.templates });
    return view(rows[0]);
  }
}
