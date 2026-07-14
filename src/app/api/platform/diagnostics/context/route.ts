//src/app/api/platform/diagnostics/context/route.ts
import { NextResponse } from "next/server";

import { getPlatformContextSnapshot } from "@/platform/core/diagnostics";
import { validateInternalRequest } from "@/platform/core/security";

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);

  if (auth.ok === false) {
    return auth.response;
  }

  try {
    const snapshot = await getPlatformContextSnapshot();

    return NextResponse.json({
      ok: true,
      data: snapshot,
    });
  } catch (error) {
    console.error("PLATFORM CONTEXT DIAGNOSTICS ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PLATFORM_CONTEXT_DIAGNOSTICS_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro ao gerar o diagnóstico de contexto.",
        },
      },
      { status: 500 },
    );
  }
}
