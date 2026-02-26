import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { whatsappAccounts } from "@/drizzle/schema";

type SendTextParams = {
  companyId: string;
  toPhone: string;
  body: string;
};

type SendResult =
  | { ok: true; provider: string; providerMessageId: string; response: any }
  | { ok: false; provider: string; error: string; response?: any };

export const WhatsAppSender = {
  async sendText(p: SendTextParams): Promise<SendResult> {
    const db = getDb();

    const wa = await db
      .select({
        id: whatsappAccounts.id,
        provider: whatsappAccounts.provider,
        providerConfig: whatsappAccounts.providerConfig,
      })
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.companyId, p.companyId))
      .limit(1);

    const provider = wa[0]?.provider ?? "mock";

    // ✅ MOCK: retorna um providerMessageId fake e “ok”
    if (provider === "mock") {
      return {
        ok: true,
        provider: "mock",
        providerMessageId: `mock_${crypto.randomUUID()}`,
        response: { mocked: true },
      };
    }

    // 🔜 META: você já tem providerConfig; aqui entra o client real
    // Por enquanto devolve erro para não enviar sem configurar
    return {
      ok: false,
      provider,
      error: "provider_not_implemented",
      response: { hint: "Implement Meta sender next" },
    };
  },
};
