//src/app/api/v1/whatsapp/webhook/route.ts
// comentário teste

import { NextRequest, NextResponse } from "next/server";
import { applyMetaMessageStatus } from "@/modules/whatsapp/whatsapp-webhook.service";

import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";

import {
  findMetaAccountByPhoneNumberId,
  saveMetaInboundMessage,
  saveMetaStatusEvent,
  saveMetaWebhookEvent,
} from "@/modules/whatsapp/meta-webhook-events.service";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const entries = body?.entry;

    const debug = {
      hasEntry: Array.isArray(entries),
      firstField: body?.entry?.[0]?.changes?.[0]?.field ?? null,
      hasStatuses: Array.isArray(
        body?.entry?.[0]?.changes?.[0]?.value?.statuses,
      ),
      hasMessages: Array.isArray(
        body?.entry?.[0]?.changes?.[0]?.value?.messages,
      ),
      phoneNumberId:
        body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ??
        null,
    };
    if (!Array.isArray(entries)) {
      return NextResponse.json({ ok: true });
    }

    for (const entry of entries) {
      const changes = entry?.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        const value = change?.value;

        console.log("[meta webhook change]", {
          field: change?.field,
          hasMessages: Array.isArray(value?.messages),
          hasStatuses: Array.isArray(value?.statuses),
          phoneNumberId: value?.metadata?.phone_number_id,
        });

        const phoneNumberId = value?.metadata?.phone_number_id
          ? String(value.metadata.phone_number_id)
          : null;

        const account = phoneNumberId
          ? await findMetaAccountByPhoneNumberId(phoneNumberId)
          : null;

        const companyId =
          account?.companyId ?? process.env.META_DEFAULT_COMPANY_ID ?? null;

        const whatsappAccountId = account?.id ?? null;

        await saveMetaWebhookEvent({
          companyId,
          eventType: change?.field ?? "unknown",
          providerMessageId: null,
          payload: body,
          headers: Object.fromEntries(req.headers.entries()),
        });

        const messages = value?.messages;
        const contacts = value?.contacts;

        if (Array.isArray(messages)) {
          for (const message of messages) {
            if (message?.type !== "text") continue;

            const fromPhone = message?.from;
            const text = message?.text?.body;
            const providerMessageId = message?.id;

            if (!fromPhone || !text || !providerMessageId) continue;

            if (!companyId) {
              console.error("[meta inbound] companyId not found", {
                phoneNumberId,
                providerMessageId,
              });
              continue;
            }

            await saveMetaInboundMessage({
              companyId,
              providerMessageId,
              fromPhone: `+${fromPhone}`,
              body: text,
              rawPayload: {
                message,
                contact: Array.isArray(contacts) ? contacts[0] : null,
                phoneNumberId,
                whatsappAccountId,
              },
            });

            await AssistantWhatsAppService.handleInbound({
              companyId,
              phone: `+${fromPhone}`,
              text,
              correlationId: providerMessageId,
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

          const firstError =
            Array.isArray(statusItem?.errors) && statusItem.errors[0]
              ? statusItem.errors[0]
              : null;

          const error =
            firstError?.title ??
            firstError?.message ??
            firstError?.details ??
            null;
          console.log("[meta status debug]", {
            phoneNumberId,
            hasAccount: !!account,
            companyId,
            whatsappAccountId,
            providerMessageId,
            mappedStatus,
          });

          if (companyId) {
            const statusTimestampMs = statusItem?.timestamp
              ? Number(statusItem.timestamp)
              : null;

            console.log("[meta status event]", {
              companyId,
              whatsappAccountId,
              providerMessageId,
              mappedStatus,
            });

            await saveMetaStatusEvent({
              companyId,
              providerMessageId,
              status: mappedStatus,
              timestampMs: statusTimestampMs,
              errorCode: firstError?.code ? String(firstError.code) : null,
              errorMessage: error,
              rawPayload: {
                statusItem,
                phoneNumberId,
                whatsappAccountId,
              },
            });
          }

          await applyMetaMessageStatus({
            providerMessageId,
            status: mappedStatus,
            error,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, debug });
  } catch (err) {
    console.error("[meta webhook] failed", err);
    return NextResponse.json({ ok: true });
  }
}
