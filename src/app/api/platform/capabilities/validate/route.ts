import { NextResponse } from "next/server";
import { validatePlatformCapabilityRegistry } from "@/platform/capabilities";
import { validateInternalRequest } from "@/platform/core/security";

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);

  if (auth.ok === false) {
    return auth.response;
  }
  const result = validatePlatformCapabilityRegistry();

  return NextResponse.json(result, {
    status: result.valid ? 200 : 500,
  });
}
