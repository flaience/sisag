import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveOrCreate: vi.fn(async () => ({ id: "client-1" })),
}));

vi.mock("@/modules/clients/ClientResolver.service", () => {
  class ClientResolverService {
    async resolveOrCreate(...args: any[]) {
      return mocks.resolveOrCreate.apply(null, args as any);
    }
  }

  return { ClientResolverService };
});

vi.mock("@/infra/outbox/OutboxPublisher", () => ({
  OutboxPublisher: { publish: vi.fn(async () => ({ id: "outbox-1" })) },
}));

const sessionsState: any = { open: null };

vi.mock(
  "@/modules/assistant/whatsapp-core/sessions/ConversationSession.service",
  () => {
    class ConversationSessionService {
      async getOpen(_companyId: string, _clientId: string) {
        return sessionsState.open;
      }

      async openOrUpdate(_companyId: string, _clientId: string, context: any) {
        sessionsState.open = { id: "sess-1", context };
        return sessionsState.open;
      }

      async close(_sessionId: string) {
        sessionsState.open = null;
        return { id: "sess-1" };
      }
    }

    return { ConversationSessionService };
  },
);

vi.mock("@/modules/appointments/Appointment.repository", () => ({
  AppointmentRepository: {
    listNextActiveByClient: vi.fn(async () => [
      { id: "a1", scheduledTime: "2026-02-14T13:00:00.000Z" },
      { id: "a2", scheduledTime: "2026-02-15T13:00:00.000Z" },
    ]),
  },
}));

vi.mock("@/modules/appointments/Appointment.service", () => ({
  AppointmentService: {
    cancelByIdForClient: vi.fn(async ({ appointmentId }: any) => ({
      ok: true,
      replyText: `cancelled:${appointmentId}`,
    })),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/time", async () => {
  const actual: any = await vi.importActual("@/lib/time");
  return {
    ...actual,
    // para o teste ficar determinístico
    formatPtBr: (iso: string) => `ptbr(${iso})`,
    DEFAULT_TIMEZONE: "America/Sao_Paulo",
    zonedDateTimeToUtcISOString: actual.zonedDateTimeToUtcISOString,
  };
});
vi.mock("@/lib/db", () => {
  const fakeDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ minCancelAdvanceMinutes: 0 }],
        }),
      }),
    }),
  };

  return {
    getDb: () => fakeDb,
  };
});
import { AssistantWhatsAppService } from "./AssistantWhatsApp.service";
import { AppointmentService } from "@/modules/appointments/Appointment.service";
import { AppointmentRepository } from "@/modules/appointments/Appointment.repository";

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
    expect(AppointmentRepository.listNextActiveByClient).toHaveBeenCalled();
    expect(sessionsState.open?.context?.pendingCancel?.mode).toBe("CHOOSE");
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
      sessionsState.open?.context?.pendingCancel?.chosenAppointmentId,
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

    expect(AppointmentService.cancelByIdForClient).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: "a2" }),
    );
  });
});
