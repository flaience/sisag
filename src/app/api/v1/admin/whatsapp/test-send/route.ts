//src/app/api/v1/admin/whatsapp/test-send/route.ts
import { NextResponse } from "next/server";
import type {
  WhatsAppTestSendRequest,
  WhatsAppTestSendResponse,
} from "@/modules/whatsapp/contracts";

// TODO: substitua pela sua resolução real de companyId (sessão/subdomínio/header)
function getCompanyIdFromRequest(): string {
  return "dummy-company-id";
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

// TODO: trocar por insert real na sua tabela outbox (Supabase/Drizzle)
async function enqueueOutboxEvent(input: {
  companyId: string;
  eventType: string;
  payload: any;
}): Promise<{ outbox_id: string }> {
  // Por enquanto, simulamos um ID para destravar a UI
  const outbox_id = crypto.randomUUID();
  return { outbox_id };
}

export async function POST(req: Request) {
  const companyId = getCompanyIdFromRequest();

  let body: WhatsAppTestSendRequest;
  try {
    body = (await req.json()) as WhatsAppTestSendRequest;
  } catch {
    const resp: WhatsAppTestSendResponse = {
      ok: false,
      error: "Invalid JSON body",
    };
    return NextResponse.json(resp, { status: 400 });
  }

  const toPhone = onlyDigits(body.toPhone ?? "");
  const text = (body.text ?? "").trim();

  if (!toPhone || toPhone.length < 10) {
    const resp: WhatsAppTestSendResponse = {
      ok: false,
      error: "toPhone inválido",
    };
    return NextResponse.json(resp, { status: 400 });
  }
  if (!text) {
    const resp: WhatsAppTestSendResponse = { ok: false, error: "text vazio" };
    return NextResponse.json(resp, { status: 400 });
  }
  if (text.length > 4096) {
    const resp: WhatsAppTestSendResponse = {
      ok: false,
      error: "text muito longo",
    };
    return NextResponse.json(resp, { status: 400 });
  }

  try {
    const { outbox_id } = await enqueueOutboxEvent({
      companyId,
      eventType: "whatsapp.send.requested",
      payload: {
        companyId,
        toPhone,
        text,
        // útil pra rastrear nos logs
        source: "admin.test-send",
        requestedAt: new Date().toISOString(),
      },
    });

    const resp: WhatsAppTestSendResponse = { ok: true, outbox_id };
    return NextResponse.json(resp, { status: 200 });
  } catch (e: any) {
    const resp: WhatsAppTestSendResponse = {
      ok: false,
      error: e?.message ?? "Failed to enqueue outbox event",
    };
    return NextResponse.json(resp, { status: 500 });
  }
}
