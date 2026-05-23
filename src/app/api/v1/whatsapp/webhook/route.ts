import { NextRequest, NextResponse } from "next/server";
import { applyMetaMessageStatus } from "@/modules/whatsapp/whatsapp-webhook.service";
import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";
import {
  saveMetaStatusEvent,
  saveMetaWebhookEvent,
} from "@/modules/whatsapp/meta-webhook-events.service";
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN || "sisag_meta_webhook_2026";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new Response("Forbidden", { status: 403 });
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const companyId = process.env.META_DEFAULT_COMPANY_ID ?? null;

    await saveMetaWebhookEvent({
      companyId,
      eventType: "raw",
      providerMessageId: null,
      payload: body,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const entries = body?.entry;
    if (!Array.isArray(entries)) {
      return NextResponse.json({ ok: true });
    }

    for (const entry of entries) {
      const changes = entry?.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        const value = change?.value;

        const messages = value?.messages;
        const contacts = value?.contacts;

        if (Array.isArray(messages)) {
          for (const message of messages) {
            if (message?.type !== "text") continue;

            const fromPhone = message?.from;
            const text = message?.text?.body;

            if (!fromPhone || !text) continue;

            const profileName =
              Array.isArray(contacts) && contacts[0]?.profile?.name
                ? contacts[0].profile.name
                : null;

            const companyId = process.env.META_DEFAULT_COMPANY_ID;

            if (!companyId) {
              console.error("[meta inbound] META_DEFAULT_COMPANY_ID missing");
              continue;
            }

            await AssistantWhatsAppService.handleInbound({
              companyId,
              phone: `+${fromPhone}`,
              text,
              correlationId: message?.id,
            });
          }
        }

        const statuses = value?.statuses;

        if (!Array.isArray(statuses)) continue;

        for (const statusItem of statuses) {
          const providerMessageId = statusItem?.id;
          const status = statusItem?.status;

          if (!providerMessageId || !status) continue;

          const mappedStatus =
            status === "sent" ||
            status === "delivered" ||
            status === "read" ||
            status === "failed"
              ? status
              : null;

          if (!mappedStatus) continue;

          const error =
            Array.isArray(statusItem?.errors) && statusItem.errors[0]
              ? (statusItem.errors[0]?.title ??
                statusItem.errors[0]?.message ??
                "Meta webhook error")
              : null;

          const statusTimestampMs = statusItem?.timestamp
            ? Number(statusItem.timestamp) * 1000
            : null;

          const firstError =
            Array.isArray(statusItem?.errors) && statusItem.errors[0]
              ? statusItem.errors[0]
              : null;

          await saveMetaStatusEvent({
            companyId: companyId ?? process.env.META_DEFAULT_COMPANY_ID!,
            providerMessageId,
            status: mappedStatus,
            timestampMs: statusTimestampMs,
            errorCode: firstError?.code ? String(firstError.code) : null,
            errorMessage:
              firstError?.title ??
              firstError?.message ??
              firstError?.details ??
              null,
            rawPayload: statusItem,
          });

          await applyMetaMessageStatus({
            providerMessageId,
            status: mappedStatus,
            error,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
