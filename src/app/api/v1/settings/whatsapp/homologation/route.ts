import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { createWhatsAppHomologationEnvelope } from "@/modules/whatsapp/homologation/WhatsAppHomologation";
import { WhatsAppHomologationAdminCommandSchema } from "@/modules/whatsapp/homologation/WhatsAppHomologationAdminApi.schema";
import { runWhatsAppHomologationShadowDecision } from "@/modules/whatsapp/homologation/WhatsAppHomologationShadowDecision.service";

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;

  const parsed = WhatsAppHomologationAdminCommandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_homologation_command", issues: parsed.error.flatten().fieldErrors }, { status: 400 });

  const envelope = createWhatsAppHomologationEnvelope({
    companyId: auth.auth.companyId,
    whatsappAccountId: auth.auth.companyId,
    senderPhoneE164: parsed.data.senderPhoneE164,
    text: parsed.data.text,
    correlationId: `homolog:${crypto.randomUUID()}`,
  });
  if (!envelope) return NextResponse.json({ ok: false, error: "invalid_homologation_envelope" }, { status: 400 });

  const result = await runWhatsAppHomologationShadowDecision(envelope);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: { "cache-control": "no-store" },
  });
}
