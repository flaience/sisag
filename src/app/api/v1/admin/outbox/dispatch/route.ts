import { NextResponse } from "next/server";
import { OutboxDispatcher } from "@/modules/outbox/OutboxDispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : 10;

    const result = await OutboxDispatcher.dispatchOnce({ limit });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("OUTBOX DISPATCH ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.cause?.message ?? err?.message ?? "Error",
        code: err?.cause?.code ?? err?.code ?? null,
      },
      { status: 500 },
    );
  }
}
