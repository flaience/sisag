import { z } from "zod";

import {
  executeCommercialOnboardingRuntime,
  type CommercialOnboardingRuntimeAdapter,
  type ExecuteCommercialOnboardingRuntimeResult,
} from "./commercial-onboarding-runtime-executor.service";

export const commercialOnboardingRuntimeEventSchema = z.object({
  outboxId: z.string().uuid(),
  eventType: z.literal("commercial.onboarding.execution_requested"),
  payload: z.unknown(),
});

export type CommercialOnboardingRuntimeEvent = z.input<
  typeof commercialOnboardingRuntimeEventSchema
>;

type Runtime = typeof executeCommercialOnboardingRuntime;
type AdapterRegistry = Partial<
  Record<"agent" | "system" | "n8n", CommercialOnboardingRuntimeAdapter>
>;

export type HandleCommercialOnboardingRuntimeEventResult =
  | {
      ok: true;
      outboxId: string;
      commandKey: string;
      outcome: string;
      replayed: boolean;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error: "invalid_event" | "runtime_failed";
      retryable: boolean;
      message: string;
    };

const nonRetryableRuntimeErrors = new Set([
  "invalid_event",
  "decision_mismatch",
]);

export async function handleCommercialOnboardingRuntimeEvent(
  rawEvent: CommercialOnboardingRuntimeEvent,
  options: {
    adapters?: AdapterRegistry;
    runtime?: Runtime;
  } = {},
): Promise<HandleCommercialOnboardingRuntimeEventResult> {
  const parsed = commercialOnboardingRuntimeEventSchema.safeParse(rawEvent);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_event",
      retryable: false,
      message:
        parsed.error.issues[0]?.message ??
        "Evento da outbox comercial inválido.",
    };
  }

  const runtime = options.runtime ?? executeCommercialOnboardingRuntime;
  let executed: ExecuteCommercialOnboardingRuntimeResult;
  try {
    executed = await runtime(parsed.data.payload, {
      adapters: options.adapters,
    });
  } catch {
    return {
      ok: false,
      error: "runtime_failed",
      retryable: true,
      message: "O runtime comercial não conseguiu processar o evento.",
    };
  }

  if (executed.ok === false) {
    return {
      ok: false,
      error: "runtime_failed",
      retryable: !nonRetryableRuntimeErrors.has(executed.error),
      message: executed.message,
    };
  }

  return {
    ok: true,
    outboxId: parsed.data.outboxId!,
    commandKey: executed.commandKey,
    outcome: executed.outcome,
    replayed: executed.replayed,
    emittedEvents: executed.emittedEvents,
  };
}

export function createCommercialOnboardingRuntimeHandler(options: {
  adapters: AdapterRegistry;
  runtime?: Runtime;
}) {
  return (event: CommercialOnboardingRuntimeEvent) =>
    handleCommercialOnboardingRuntimeEvent(event, options);
}
