import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { BookingReminderSettingsService } from "@/modules/automation/BookingReminderSettings.service";

export async function GET(request: NextRequest) { const authResult = await requireApiRole(request, ["owner", "admin"]); if (authResult.ok === false) return authResult.response; return NextResponse.json({ ok: true, settings: await BookingReminderSettingsService.get(authResult.auth.companyId) }); }
export async function PUT(request: NextRequest) { const authResult = await requireApiRole(request, ["owner", "admin"]); if (authResult.ok === false) return authResult.response; try { const settings = await BookingReminderSettingsService.save(authResult.auth.companyId, await request.json()); return NextResponse.json({ ok: true, settings }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "invalid_reminder_settings", issues: error.flatten().fieldErrors }, { status: 400 }); console.error("booking reminder settings error", error); return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 }); } }
