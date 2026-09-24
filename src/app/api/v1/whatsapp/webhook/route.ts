//src/app/api/v1/whatsapp/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ConversationTransactionError } from "@/lib/db";
import { applyMetaMessageStatus } from "@/modules/whatsapp/whatsapp-webhook.service";
import { ConversationEngine } from "@/modules/conversation/ConversationEngine";
import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";
import { parseMetaWhatsAppInboundMessage } from "@/modules/assistant/inbound/MetaWhatsAppInboundMessage";

import {
  findMetaAccountByPhoneNumberId,
  saveMetaInboundMessage,
  saveMetaStatusEvent,
  saveMetaWebhookEvent,
} from "@/modules/whatsapp/meta-webhook-events.service";

class InboundReceiptStorageError extends Error {}

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
            const inbound = parseMetaWhatsAppInboundMessage(message);
            if (!inbound) continue;

            const { fromPhone, providerMessageId } = inbound;

            if (!companyId) {
              console.error("[meta inbound] companyId not found", {
                phoneNumberId,
                providerMessageId,
              });
              continue;
            }

            const inboundEngine =
              process.env.WHATSAPP_INBOUND_ENGINE ?? "assistant";

            await saveMetaInboundMessage({
              companyId,
              whatsappAccountId,
              providerMessageId,
              fromPhone,
              messageType: inbound.kind,
              body: inbound.kind === "text" ? inbound.text : "[audio awaiting transcription]",
              rawPayload: {
                message,
                contact: Array.isArray(contacts) ? contacts[0] : null,
                phoneNumberId,
                whatsappAccountId,
                processing: inbound.kind === "audio" ? "pending_transcription" : "ready",
                media: inbound.kind === "audio" ? inbound.audio : null,
              },
            }).catch((error: unknown) => {
              // Only the assistant has the committed-reply replay guard.
              if (inboundEngine !== "conversation") throw new InboundReceiptStorageError();
              throw error;
            });

            // Audio is acknowledged only after its durable receipt. A later,
            // authorized boundary will download and transcribe it.
            if (inbound.kind === "audio") continue;

            if (inboundEngine === "conversation") {
              await ConversationEngine.process({
                companyId,
                fromPhone,
                text: inbound.text,
              });
            } else {
              await AssistantWhatsAppService.handleInbound({
                companyId,
                phone: fromPhone,
                text: inbound.text,
                correlationId: providerMessageId,
              });
            }
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
              whatsappAccountId,
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
    if (err instanceof ConversationTransactionError || err instanceof InboundReceiptStorageError) {
      return NextResponse.json({ ok: false, error: "inbound_processing_failed" }, { status: 503 });
    }
    console.error("[meta webhook] failed", err);
    return NextResponse.json({ ok: true });
  }
}
