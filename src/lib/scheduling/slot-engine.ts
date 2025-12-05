//src/lib/scheduling/slot-engine.ts
import { db } from "@/lib/db";
import { schedulingConfig } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function getSlotConfig(companyId: string) {
  const config = await db
    .select()
    .from(schedulingConfig)
    .where(eq(schedulingConfig.companyId, companyId));

  if (!config) {
    throw new Error("Configuração de agendamento não encontrada");
  }

  return config;
}

export function generateTimeSlots(
  start: string,
  end: string,
  slotMinutes: number
) {
  const slots: string[] = [];

  let [hour, min] = start.split(":").map(Number);
  const [endHour, endMin] = end.split(":").map(Number);

  while (hour < endHour || (hour === endHour && min + slotMinutes <= endMin)) {
    const h = String(hour).padStart(2, "0");
    const m = String(min).padStart(2, "0");
    slots.push(`${h}:${m}`);

    min += slotMinutes;
    if (min >= 60) {
      hour++;
      min = 0;
    }
  }

  return slots;
}
