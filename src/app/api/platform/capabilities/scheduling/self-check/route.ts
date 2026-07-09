import { NextResponse } from "next/server";
import { selfCheckSchedulingCapability } from "@/platform/capabilities/scheduling";
import { validateInternalRequest } from "@/platform/core/security";

export async function GET(request: Request) {
  const auth = validateInternalRequest(request);

  if (auth.ok === false) {
    return auth.response;
  }

  return NextResponse.json(selfCheckSchedulingCapability());
}
