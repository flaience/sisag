import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { BookingReminderMonitoringService } from "@/modules/automation/BookingReminderMonitoring.service";
export async function GET(request: NextRequest) { const authResult = await requireApiRole(request, ["owner", "admin"]); if (authResult.ok === false) return authResult.response; const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? 30); const activity = await BookingReminderMonitoringService.get(authResult.auth.companyId, Number.isFinite(limitValue) ? limitValue : 30); return NextResponse.json({ ok: true, ...activity }); }
