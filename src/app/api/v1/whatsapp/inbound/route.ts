// src/app/api/v1/whatsapp/inbound/route.ts
import { NextResponse } from "next/server";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

// payload simples (mock). Depois você adapta para Meta/Z-API.
type InboundPayload = {
  companyId: string;
  fromPhone: string; // E.164
  text: string;
  professionalId: string;
  clientId: string;
};

function parseDateTimeFromText(text: string): string | null {
  // MVP: espera "YYYY-MM-DD HH:mm"
  const m = text.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:00.000Z`; // MVP UTC; depois ajusta timezone
  return iso;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as InboundPayload | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const { companyId, fromPhone, text, professionalId, clientId } = body;

  if (!companyId || !fromPhone || !text || !professionalId || !clientId) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  // MVP: usuário manda "2026-02-11 10:00"
  const scheduledIso = parseDateTimeFromText(text);
  if (!scheduledIso) {
    return NextResponse.json(
      {
        ok: true,
        replyText: "Envie no formato: 2026-02-11 10:00",
      },
      { status: 200 },
    );
  }

  // cria agendamento (isso já emite outbox appointment.created)
  const result = await AppointmentService.create({
    professionalId,
    clientId,
    scheduledTime: scheduledIso,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: true, replyText: `Não consegui agendar: ${result.message}` },
      { status: 200 },
    );
  }

  // ✅ A confirmação real será enviada pelo whatsapp-worker via outbox.
  return NextResponse.json(
    { ok: true, replyText: "Ok! Vou confirmar e te aviso ✅" },
    { status: 200 },
  );
}
