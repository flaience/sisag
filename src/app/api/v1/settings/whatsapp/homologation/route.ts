import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { whatsappAccounts } from "@/drizzle/schema";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { getDb } from "@/lib/db";
import { createWhatsAppHomologationEnvelope } from "@/modules/whatsapp/homologation/WhatsAppHomologation";
import { WhatsAppHomologationAdminCommandSchema } from "@/modules/whatsapp/homologation/WhatsAppHomologationAdminApi.schema";
import { runWhatsAppHomologationShadowDecision } from "@/modules/whatsapp/homologation/WhatsAppHomologationShadowDecision.service";

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;

  const parsed = WhatsAppHomologationAdminCommandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_homologation_command", issues: parsed.error.flatten().fieldErrors }, { status: 400 });

  const account = await getDb().select({ id: whatsappAccounts.id }).from(whatsappAccounts).where(and(
    eq(whatsappAccounts.id, parsed.data.whatsappAccountId),
    eq(whatsappAccounts.companyId, auth.auth.companyId),
  )).limit(1);
  if (!account[0]) return NextResponse.json({ ok: false, error: "whatsapp_account_not_found" }, { status: 404 });

  const envelope = createWhatsAppHomologationEnvelope({
    companyId: auth.auth.companyId,
    whatsappAccountId: account[0].id,
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
