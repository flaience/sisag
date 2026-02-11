// src/app/api/v1/whatsapp/inbound/route.ts
import { NextResponse } from "next/server";
import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";

type InboundPayload = {
  companyId: string;
  fromPhone: string; // E.164 (ou raw)
  text: string;
  correlationId?: string;
  fromName?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as InboundPayload | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const { companyId, fromPhone, text, correlationId } = body;

  if (!companyId || !fromPhone || !text) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  const result = await AssistantWhatsAppService.handleInbound({
    companyId,
    phone: fromPhone,
    text,
    correlationId,
  });

  return NextResponse.json(result, { status: 200 });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "method_not_allowed" },
    { status: 405 },
  );
}
