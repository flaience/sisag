export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PeopleService } from "@/modules/people/People.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await PeopleService.getById(id);

  if (!data)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await PeopleService.update(id, body);

  if (!updated)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await PeopleService.remove(id);

  if (!deleted)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
