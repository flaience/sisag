import { NextResponse } from "next/server";
import { validatePlatformCapabilityRegistry } from "@/platform/capabilities";

export async function GET() {
  const result = validatePlatformCapabilityRegistry();

  return NextResponse.json(result, {
    status: result.valid ? 200 : 500,
  });
}
