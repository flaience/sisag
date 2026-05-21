import { NextRequest, NextResponse } from "next/server";
import { applyMetaMessageStatus } from "@/modules/whatsapp/whatsapp-webhook.service";

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
    console.log("[meta webhook received]", JSON.stringify(body));

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

            console.log("[meta inbound]", {
              fromPhone,
              text,
              profileName,
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
