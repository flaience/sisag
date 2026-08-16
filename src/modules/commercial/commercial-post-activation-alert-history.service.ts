import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { commercialClients, commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { commercialPostActivationAlertActionSchema } from "./commercial-post-activation-alert-action.service";

const inputSchema = z.object({
  cursor: z.string().trim().min(1).max(2000).optional(),
  action: z.enum(["acknowledged", "resolved"]).optional(),
  actorType: z.enum(["human", "agent", "system"]).optional(),
  limit: z.number().int().positive().max(100).default(25),
});

const cursorSchema = z.object({
  actedAt: z.string().datetime(),
  idempotencyKey: z.string().trim().min(1).max(400),
});

const actionHistorySchema = z.array(commercialPostActivationAlertActionSchema).max(1000);

type HistoryCandidate = {
  onboardingId: string;
  commercialClientId: string;
  clientName: string;
  result: Record<string, unknown>;
};

type HistoryStore = {
  listCandidates(limit: number): Promise<HistoryCandidate[]>;
};

type AlertAction = z.output<typeof commercialPostActivationAlertActionSchema>;

export type ListCommercialPostActivationAlertHistoryInput = {
  cursor?: string;
  action?: AlertAction["action"];
  actorType?: AlertAction["actor"]["type"];
  limit?: number;
};

export type CommercialPostActivationAlertHistoryItem = AlertAction & {
  onboardingId: string;
  commercialClientId: string;
  clientName: string;
};

export type ListCommercialPostActivationAlertHistoryResult =
  | {
      ok: false;
      error: "invalid_input";
      message: string;
    }
  | {
      ok: true;
      data: {
        items: CommercialPostActivationAlertHistoryItem[];
        summary: {
          acknowledged: number;
          resolved: number;
          total: number;
        };
        invalidRecords: number;
        nextCursor: string | null;
      };
    };

export async function listCommercialPostActivationAlertHistory(
  rawInput: ListCommercialPostActivationAlertHistoryInput = {},
  options: { store?: HistoryStore } = {},
): Promise<ListCommercialPostActivationAlertHistoryResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Consulta do histórico de alertas inválida.",
    };
  }

  const cursor = parsed.data.cursor
    ? decodeCursor(parsed.data.cursor)
    : null;
  if (parsed.data.cursor && !cursor) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Cursor do histórico de alertas inválido.",
    };
  }

  const candidates = await (options.store ?? createDrizzleHistoryStore()).listCandidates(100);
  let invalidRecords = 0;
  const items = candidates.flatMap<CommercialPostActivationAlertHistoryItem>((candidate) => {
    const history = actionHistorySchema.safeParse(
      candidate.result.postActivationAlertActions ?? [],
    );
    if (!history.success) {
      invalidRecords += 1;
      return [];
    }

    return history.data.map((action) => ({
      ...action,
      onboardingId: candidate.onboardingId,
      commercialClientId: candidate.commercialClientId,
      clientName: candidate.clientName,
    }));
  });

  items.sort((left, right) => {
    const byDate = new Date(right.actedAt).getTime() - new Date(left.actedAt).getTime();
    return byDate || right.idempotencyKey.localeCompare(left.idempotencyKey);
  });

  const filtered = items.filter((item) => (
    (!parsed.data.action || item.action === parsed.data.action)
    && (!parsed.data.actorType || item.actor.type === parsed.data.actorType)
  ));
  const cursorIndex = cursor
    ? filtered.findIndex((item) => (
      item.actedAt === cursor.actedAt
      && item.idempotencyKey === cursor.idempotencyKey
    ))
    : -1;
  if (cursor && cursorIndex === -1) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Cursor do histórico de alertas não encontrado.",
    };
  }

  const remaining = filtered.slice(cursorIndex + 1);
  const selected = remaining.slice(0, parsed.data.limit);
  const acknowledged = selected.filter((item) => item.action === "acknowledged").length;
  const lastItem = selected.at(-1);
  const nextCursor = remaining.length > selected.length && lastItem
    ? encodeCursor(lastItem)
    : null;

  return {
    ok: true,
    data: {
      items: selected,
      summary: {
        acknowledged,
        resolved: selected.length - acknowledged,
        total: selected.length,
      },
      invalidRecords,
      nextCursor,
    },
  };
}

function encodeCursor(item: Pick<AlertAction, "actedAt" | "idempotencyKey">) {
  return Buffer.from(JSON.stringify({
    actedAt: item.actedAt,
    idempotencyKey: item.idempotencyKey,
  }), "utf8").toString("base64url");
}

function decodeCursor(value: string) {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

function createDrizzleHistoryStore(): HistoryStore {
  return {
    async listCandidates(limit) {
      const rows = await getDb().select({
        onboardingId: commercialOnboardings.id,
        commercialClientId: commercialClients.id,
        legalName: commercialClients.legalName,
        tradeName: commercialClients.tradeName,
        result: commercialOnboardings.result,
      }).from(commercialOnboardings)
        .innerJoin(
          commercialClients,
          eq(commercialClients.id, commercialOnboardings.commercialClientId),
        )
        .where(eq(commercialOnboardings.status, "completed"))
        .orderBy(desc(commercialOnboardings.updatedAt))
        .limit(limit);

      return rows.map((row) => ({
        onboardingId: row.onboardingId,
        commercialClientId: row.commercialClientId,
        clientName: row.tradeName?.trim() || row.legalName,
        result: (row.result ?? {}) as Record<string, unknown>,
      }));
    },
  };
}
