import { NextResponse } from "next/server";
import { getPlatformSecret } from "../config";

export type InternalRequestValidation =
  | {
      ok: true;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export function validateInternalRequest(
  request: Request,
): InternalRequestValidation {
  const expectedSecret =
    getPlatformSecret("PLATFORM_INTERNAL_SECRET") ??
    getPlatformSecret("SISAG_INTERNAL_SECRET");

  if (!expectedSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Platform internal secret not configured.",
        },
        {
          status: 500,
        },
      ),
    };
  }

  const receivedSecret = request.headers.get("x-platform-internal-secret");

  if (receivedSecret !== expectedSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      ),
    };
  }

  return {
    ok: true,
  };
}
