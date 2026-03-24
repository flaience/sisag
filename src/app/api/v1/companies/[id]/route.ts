export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { CompanyService } from "@/modules/companies/Company.service";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const data = await CompanyService.getById(params.id);

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Empresa não encontrada.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: data,
    });
  } catch (error: any) {
    console.error("GET /api/v1/companies/[id] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao buscar empresa.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();

    const updated = await CompanyService.update(params.id, body);

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Empresa não encontrada.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/v1/companies/[id] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao atualizar empresa.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const deleted = await CompanyService.remove(params.id);

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Empresa não encontrada.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("DELETE /api/v1/companies/[id] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao remover empresa.",
      },
      { status: 500 },
    );
  }
}
