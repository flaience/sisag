import { NextResponse } from "next/server";
import { validatePlatformCapabilityRegistry } from "@/platform/capabilities";

function getInternalSecret() {
  return (
    process.env.PLATFORM_INTERNAL_SECRET || process.env.SISAG_INTERNAL_SECRET
  );
}

export async function GET(request: Request) {
  const expectedSecret = getInternalSecret();
  const receivedSecret = request.headers.get("x-platform-internal-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const result = validatePlatformCapabilityRegistry();

  return NextResponse.json(result, {
    status: result.valid ? 200 : 500,
  });
}
