import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { BookingReminderOutcomesService } from "@/modules/automation/BookingReminderOutcomes.service";
export async function GET(request: NextRequest) { const authResult = await requireApiRole(request, ["owner", "admin"]); if (authResult.ok === false) return authResult.response; const days = Number(request.nextUrl.searchParams.get("days") ?? 30); const outcomes = await BookingReminderOutcomesService.get({ companyId: authResult.auth.companyId, days }); return NextResponse.json({ ok: true, periodDays: [7, 30, 90].includes(days) ? days : 30, outcomes }); }
