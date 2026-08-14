import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  isNotNull,
} from "drizzle-orm";
import { z } from "zod";

import {
  appointments,
  messageLogs,
  professionals,
  schedulingConfig,
  whatsappAccounts,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import type { CommercialPostActivationOperationalSnapshot } from "./commercial-post-activation-operational-signals.service";

const inputSchema = z.object({
  companyId: z.string().uuid(),
  activatedAt: z.string().datetime(),
});

export type ReadCommercialPostActivationOperationalSnapshotInput = z.input<
  typeof inputSchema
>;

type OperationalMetricsStore = {
  read(input: {
    companyId: string;
    activatedAt: Date;
    weeklyWindowStartedAt: Date;
  }): Promise<CommercialPostActivationOperationalSnapshot>;
};

export type ReadCommercialPostActivationOperationalSnapshotResult =
  | { ok: true; snapshot: CommercialPostActivationOperationalSnapshot }
  | { ok: false; error: "invalid_input"; message: string };

export async function readCommercialPostActivationOperationalSnapshot(
  rawInput: ReadCommercialPostActivationOperationalSnapshotInput,
  options: { store?: OperationalMetricsStore; now?: () => Date } = {},
): Promise<ReadCommercialPostActivationOperationalSnapshotResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Contexto operacional inválido.",
    };
  }

  const activatedAt = new Date(parsed.data.activatedAt);
  const now = options.now?.() ?? new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyWindowStartedAt = activatedAt > sevenDaysAgo ? activatedAt : sevenDaysAgo;
  const store = options.store ?? createDrizzleOperationalMetricsStore();
  const snapshot = await store.read({
    companyId: parsed.data.companyId,
    activatedAt,
    weeklyWindowStartedAt,
  });
  return { ok: true, snapshot };
}

function createDrizzleOperationalMetricsStore(): OperationalMetricsStore {
  const db = getDb();
  return {
    async read({ companyId, activatedAt, weeklyWindowStartedAt }) {
      const [
        configurationRows,
        channelRows,
        appointmentRows,
        weeklyAppointmentRows,
        professionalRows,
        activeProfessionalRows,
        outboundRows,
        failedRows,
      ] = await Promise.all([
        db.select({ value: count() })
          .from(schedulingConfig)
          .where(eq(schedulingConfig.companyId, companyId)),
        db.select({ value: count() })
          .from(whatsappAccounts)
          .where(and(
            eq(whatsappAccounts.companyId, companyId),
            eq(whatsappAccounts.status, "active"),
          )),
        db.select({ value: count() })
          .from(appointments)
          .where(and(
            eq(appointments.companyId, companyId),
            gte(appointments.createdAt, activatedAt),
          )),
        db.select({ value: count() })
          .from(appointments)
          .where(and(
            eq(appointments.companyId, companyId),
            gte(appointments.createdAt, weeklyWindowStartedAt),
          )),
        db.select({ value: count() })
          .from(professionals)
          .where(and(
            eq(professionals.companyId, companyId),
            eq(professionals.status, "active"),
          )),
        db.select({ value: countDistinct(appointments.professionalId) })
          .from(appointments)
          .where(and(
            eq(appointments.companyId, companyId),
            gte(appointments.createdAt, activatedAt),
            isNotNull(appointments.professionalId),
          )),
        db.select({ value: count() })
          .from(messageLogs)
          .where(and(
            eq(messageLogs.companyId, companyId),
            gte(messageLogs.createdAt, activatedAt),
          )),
        db.select({ value: count() })
          .from(messageLogs)
          .where(and(
            eq(messageLogs.companyId, companyId),
            gte(messageLogs.createdAt, activatedAt),
            isNotNull(messageLogs.failedAt),
          )),
      ]);

      return {
        hasSchedulingConfiguration: Number(configurationRows[0]?.value ?? 0) > 0,
        activeChannelCount: Number(channelRows[0]?.value ?? 0),
        appointmentsSinceActivation: Number(appointmentRows[0]?.value ?? 0),
        appointmentsLast7Days: Number(weeklyAppointmentRows[0]?.value ?? 0),
        activeProfessionalCount: Number(professionalRows[0]?.value ?? 0),
        professionalsWithAppointments: Number(activeProfessionalRows[0]?.value ?? 0),
        outboundMessageCount: Number(outboundRows[0]?.value ?? 0),
        failedMessageCount: Number(failedRows[0]?.value ?? 0),
      };
    },
  };
}
