import { NextResponse } from "next/server";

export function forbiddenResponse(
  message = "Você não tem permissão para executar esta ação.",
) {
  return NextResponse.json(
    {
      ok: false,
      error: "forbidden",
      message,
    },
    { status: 403 },
  );
}
