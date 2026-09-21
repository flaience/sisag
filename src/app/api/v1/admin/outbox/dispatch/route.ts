import { NextResponse } from "next/server";

// Retired queue consumer. Do not restore dispatch here: the dedicated worker
// owns delivery. No authentication, body parsing, database or transport is needed
// for this unconditional refusal, including requests with valid credentials.
export async function POST(_req: Request) {
  return NextResponse.json(
    { ok: false, error: "legacy_outbox_dispatch_disabled" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
