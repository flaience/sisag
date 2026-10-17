import { eq } from "drizzle-orm";
import { schedulingConfig } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const DEFAULT_MIN_LEAD_MINUTES = 60;
const DEFAULT_STEP_MINUTES = 15;

export async function loadN8nAgentBookingMinLeadMinutes(companyId: string) {
  try {
    const rows = await getDb().select({ value: schedulingConfig.minBookingAdvanceMinutes }).from(schedulingConfig).where(eq(schedulingConfig.companyId, companyId)).limit(1);
    const value = rows[0]?.value ?? DEFAULT_MIN_LEAD_MINUTES;
    return Math.min(Math.max(Math.floor(value), 0), 43_200);
  } catch {
    return DEFAULT_MIN_LEAD_MINUTES;
  }
}

export function resolveN8nAgentAvailabilityStart(input: { requestedFrom: string; now: Date; minLeadMinutes: number; stepMinutes?: number }) {
  const requested = new Date(input.requestedFrom);
  if (!Number.isFinite(requested.getTime()) || !Number.isFinite(input.now.getTime())) return input.requestedFrom;
  const leadMinutes = Number.isFinite(input.minLeadMinutes) ? Math.min(Math.max(Math.floor(input.minLeadMinutes), 0), 43_200) : DEFAULT_MIN_LEAD_MINUTES;
  const stepMinutes = Number.isFinite(input.stepMinutes) && input.stepMinutes! > 0 ? Math.min(Math.floor(input.stepMinutes!), 1440) : DEFAULT_STEP_MINUTES;
  const earliest = new Date(input.now.getTime() + leadMinutes * 60_000);
  const lowerBound = requested > earliest ? requested : earliest;
  const stepMs = stepMinutes * 60_000;
  return new Date(Math.ceil(lowerBound.getTime() / stepMs) * stepMs).toISOString();
}
