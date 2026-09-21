import { NextResponse } from "next/server";

// Retired legacy outbox consumer, NOT a provider's inbound webhook.
// Unconditional refusal: no body, credentials, database or transport is accessed.
export async function POST(_req: Request) {
  return NextResponse.json(
    { ok: false, error: "legacy_outbox_dispatch_disabled" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
