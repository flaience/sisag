import { asc } from "drizzle-orm";

import {
  companies,
  professionals,
  professionalSchedules,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import type { PlatformContextSnapshot } from "./types";

export async function getPlatformContextSnapshot(): Promise<PlatformContextSnapshot> {
  const db = getDb();

  const [companyRows, professionalRows, scheduleRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
      })
      .from(companies)
      .orderBy(asc(companies.name))
      .limit(100),

    db
      .select({
        id: professionals.id,
        companyId: professionals.companyId,
        resourceId: professionals.resourceId,
        name: professionals.name,
      })
      .from(professionals)
      .orderBy(asc(professionals.name))
      .limit(200),

    db
      .select({
        professionalId: professionalSchedules.professionalId,
        weekday: professionalSchedules.weekday,
        startTime: professionalSchedules.startTime,
        endTime: professionalSchedules.endTime,
      })
      .from(professionalSchedules)
      .limit(500),
  ]);

  return {
    generatedAt: new Date().toISOString(),

    companies: companyRows.map((company) => ({
      id: company.id,
      name: company.name,
    })),

    professionals: professionalRows.map((professional) => ({
      id: professional.id,
      companyId: professional.companyId,
      resourceId: professional.resourceId ?? null,
      name: professional.name,
    })),

    professionalSchedules: scheduleRows.map((schedule) => {
      const professional = professionalRows.find(
        (item) => item.id === schedule.professionalId,
      );

      return {
        professionalId: schedule.professionalId,
        resourceId: professional?.resourceId ?? null,
        weekday: schedule.weekday,
        startTime: String(schedule.startTime),
        endTime: String(schedule.endTime),
      };
    }),
  };
}
