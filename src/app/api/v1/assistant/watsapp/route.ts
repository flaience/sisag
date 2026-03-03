// src/app/api/v1/assistant/watsapp/route.ts
// teste
import { NextResponse } from "next/server";

import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";

import { requireWebhookContext } from "@/lib/request-context";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      );
    }

    // ✅ valida secret + resolve companyId (body.companyId OU header x-company-id)
    // mantém seus nomes atuais de header/env
    const ctx = requireWebhookContext(req, body, {
      secretHeaderName: "x-sisag-secret",
      expectedSecretEnv: "OUTBOX_WEBHOOK_SECRET",
      companyHeaderName: "x-company-id",
    });

    const phone = (body?.phone ?? "").toString();
    const text = (body?.text ?? "").toString();

    // opcional (mas recomendado pra dedupe)
    const correlationId =
      (body?.correlationId ?? body?.messageId ?? "").toString() || null;

    if (!phone || !text) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_fields",
          message: "phone e text são obrigatórios",
        },
        { status: 400 },
      );
    }

    const result = await AssistantWhatsAppService.handleInbound({
      companyId: ctx.companyId,
      phone,
      text,
      correlationId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message ?? "");

    // ✅ mapeia erros do requireWebhookContext
    if (msg.startsWith("unauthorized:")) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    if (msg === "missing_company_id") {
      return NextResponse.json(
        { ok: false, error: "missing_company_id" },
        { status: 400 },
      );
    }

    if (msg.startsWith("server_misconfigured:")) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 },
      );
    }

    console.error("[assistant/whatsapp] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "method_not_allowed" },
    { status: 405 },
  );
}
