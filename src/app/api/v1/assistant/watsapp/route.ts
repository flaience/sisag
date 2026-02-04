import { NextResponse } from "next/server";
import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";

function getHeader(req: Request, name: string) {
  // headers no fetch são case-insensitive, mas padronizamos
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

export async function POST(req: Request) {
  try {
    const secret = getHeader(req, "x-sisag-secret") ?? "";
    const expected = process.env.OUTBOX_WEBHOOK_SECRET ?? "";

    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 },
      );
    }

    if (!secret || secret !== expected) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);

    const phone = (body?.phone ?? "").toString();
    const text = (body?.text ?? "").toString();

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
      phone,
      text,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[assistant/whatsapp] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
