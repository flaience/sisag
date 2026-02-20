import { NextResponse } from "next/server";
import type { WhatsAppStatusResponse } from "@/modules/whatsapp/contracts";

// TODO: troque por auth real (session) e resolução do companyId
function getCompanyIdFromRequest(): string {
  // ex: pegar do JWT, session, subdomain, header etc.
  return "dummy-company-id";
}

export async function GET() {
  const companyId = getCompanyIdFromRequest();

  // TODO: buscar do banco (whatsapp_channel por companyId)
  // Por enquanto, retorno mock para a UI funcionar
  const data: WhatsAppStatusResponse = {
    provider: "meta",
    connection_status: "disconnected",
    phone_number_id: undefined,
    waba_id: undefined,
    display_number: undefined,
    display_name: undefined,
    last_error: null,
    last_sync_at: null,
  };

  return NextResponse.json(data, { status: 200 });
}
