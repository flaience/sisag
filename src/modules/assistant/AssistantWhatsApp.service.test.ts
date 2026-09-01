// src/modules/assistant/AssistantWhatsApp.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ===========================
 * HOISTED STATE (shared)
 * ===========================
 */
const sessionsState: any = { open: null };

const mocks = vi.hoisted(() => ({
  resolveOrCreate: vi.fn(async () => ({ id: "client-1" })),
  outboxPublish: vi.fn(async () => ({ id: "outbox-1" })),
  cancel: vi.fn(async ({ bookingId }: any) => ({
    ok: true,
    replyText: `cancelled:${bookingId}`,
  })),
  listUpcoming: vi.fn(async () => [
    { bookingId: "a1", scheduledTimeUtc: "2026-02-14T13:00:00.000Z" },
    { bookingId: "a2", scheduledTimeUtc: "2026-02-15T13:00:00.000Z" },
  ]),
}));

/**
 * ===========================
 * MOCKS (constructable classes)
 * ===========================
 */

// ClientResolverService (new ClientResolverService())
vi.mock("@/modules/clients/ClientResolver.service", () => {
  return {
    ClientResolverService: class {
      resolveOrCreate = mocks.resolveOrCreate;
    },
  };
});

// ConversationSessionService (new ConversationSessionService())
vi.mock(
  "@/modules/assistant/whatsapp-core/sessions/ConversationSession.service",
  () => {
    return {
      ConversationSessionService: class {
        async getOpen() {
          return sessionsState.open;
        }
        async openOrUpdate(
          _companyId: string,
          _clientId: string,
          context: any,
        ) {
          sessionsState.open = { id: "sess-1", context };
          return sessionsState.open;
        }
        async close(_sessionId: string) {
          sessionsState.open = null;
          return { id: "sess-1" };
        }
      },
    };
  },
);

// OutboxPublisher
vi.mock("@/infra/outbox/OutboxPublisher", () => ({
  OutboxPublisher: { publish: mocks.outboxPublish },
}));

// WhatsAppBookingLifecycleService
vi.mock("@/modules/automation/BookingFollowupFeedback.service", () => ({ BookingFollowupFeedbackService: { handle: vi.fn(async () => ({ handled: false })) } }));

vi.mock("@/modules/automation/BookingReminderResponse.service", () => ({
  BookingReminderResponseService: {
    handle: vi.fn(async () => ({ handled: false })),
  },
}));

vi.mock("@/modules/bookings/WhatsAppBookingLifecycle.service", () => ({
  WhatsAppBookingLifecycleService: {
    listUpcoming: mocks.listUpcoming,
    cancel: mocks.cancel,
    reschedule: vi.fn(),
  },
}));

/**
 * Mock DB access so getMinCancelAdvanceMinutes() doesn't explode in tests.
 * AssistantWhatsAppService calls getDb() -> db.select().from().where().limit().
 */
vi.mock("@/lib/db", () => {
  return {
    getDb: () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ minCancelAdvanceMinutes: 0 }],
          }),
        }),
      }),
    }),
  };
});

// Make time deterministic
vi.mock("@/lib/time", async () => {
  const actual: any = await vi.importActual("@/lib/time");
  return {
    ...actual,
    formatPtBr: (iso: string) => `ptbr(${iso})`,
    DEFAULT_TIMEZONE: "America/Sao_Paulo",
    zonedDateTimeToUtcISOString: actual.zonedDateTimeToUtcISOString,
  };
});

// Keep interpretMessage stable for "cancelar"
vi.mock("./whatsapp-core/interpreter/interpretMessage", () => ({
  interpretMessage: (text: string) => {
    const t = (text || "").trim().toLowerCase();
    if (t.includes("cancel")) return { intent: "CANCEL_REQUEST", slots: {} };
    if (t.includes("ajuda")) return { intent: "HELP", slots: {} };
    return { intent: "UNKNOWN", slots: {} };
  },
}));

/**
 * ===========================
 * SUT IMPORTS
 * ===========================
 */
import { AssistantWhatsAppService } from "./AssistantWhatsApp.service";
import { WhatsAppBookingLifecycleService } from "@/modules/bookings/WhatsAppBookingLifecycle.service";
import { WhatsAppBookingLifecycleService } from "@/modules/bookings/WhatsAppBookingLifecycle.service";

describe("AssistantWhatsAppService CANCEL CHOOSE flow", () => {
  beforeEach(() => {
    sessionsState.open = null;
    vi.clearAllMocks();
  });

  it("CANCEL_REQUEST -> lists options (CHOOSE)", async () => {
    const res = await AssistantWhatsAppService.handleInbound({
      companyId: "c1",
      phone: "+5551999999999",
      text: "cancelar",
    });

    expect(res.ok).toBe(true);

    expect(WhatsAppBookingLifecycleService.listUpcoming).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "c1",
        limit: 3,
      }),
    );

    expect(sessionsState.open?.context?.pendingCancel?.mode).toBe("CHOOSE");
    expect(sessionsState.open?.context?.pendingCancel?.options?.length).toBe(2);
  });

  it("choose 2 -> asks SIM/NÃO for appointment a2", async () => {
    // step1: entrar no CHOOSE
    await AssistantWhatsAppService.handleInbound({
      companyId: "c1",
      phone: "+5551999999999",
      text: "cancelar",
    });

    // step2: escolhe "2"
    await AssistantWhatsAppService.handleInbound({
      companyId: "c1",
      phone: "+5551999999999",
      text: "2",
    });

    expect(sessionsState.open?.context?.pendingCancel?.mode).toBe("SINGLE");
    expect(
      sessionsState.open?.context?.pendingCancel?.chosenBookingId,
    ).toBe("a2");
  });

  it("SIM after choosing 2 -> cancels appointment a2", async () => {
    // step1: CHOOSE
    await AssistantWhatsAppService.handleInbound({
      companyId: "c1",
      phone: "+5551999999999",
      text: "cancelar",
    });

    // step2: choose 2
    await AssistantWhatsAppService.handleInbound({
      companyId: "c1",
      phone: "+5551999999999",
      text: "2",
    });

    // step3: SIM
    await AssistantWhatsAppService.handleInbound({
      companyId: "c1",
      phone: "+5551999999999",
      text: "sim",
    });

    expect(WhatsAppBookingLifecycleService.cancel).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "a2", companyId: "c1" }),
    );
  });
});
