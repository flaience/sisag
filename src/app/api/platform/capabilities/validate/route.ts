import { NextResponse } from "next/server";
import { validatePlatformCapabilityRegistry } from "@/platform/capabilities";
import { getPlatformSecret } from "@/platform/core/config";

function getInternalSecret() {
  return (
    getPlatformSecret("PLATFORM_INTERNAL_SECRET") ||
    getPlatformSecret("SISAG_INTERNAL_SECRET")
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
