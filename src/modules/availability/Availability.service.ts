import { and, eq, lt, gt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookingItemAllocations, resources } from "@/drizzle/schema";

export const AvailabilityService = {
  async listBusyResources(input: {
    companyId: string;
    startTime: Date;
    endTime: Date;
    typeId?: string;
  }) {
    const db = getDb();

    // Pega resources ocupados no intervalo
    // overlap: start < endTime AND end > startTime
    const rows = await db
      .select({
        resourceId: bookingItemAllocations.resourceId,
      })
      .from(bookingItemAllocations)
      .innerJoin(resources, eq(resources.id, bookingItemAllocations.resourceId))
      .where(
        and(
          eq(resources.companyId, input.companyId),
          input.typeId ? eq(resources.typeId, input.typeId) : undefined,
          lt(bookingItemAllocations.startTime, input.endTime),
          gt(bookingItemAllocations.endTime, input.startTime),
        ),
      );

    // unique ids
    const set = new Set(rows.map((r) => r.resourceId));
    return Array.from(set);
  },
};
