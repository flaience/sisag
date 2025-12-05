//src/app/api/v1/scheduling/config/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { schedulingConfig } from "@/drizzle/schema";

export async function GET() {
  try {
    const config = await db.select().from(schedulingConfig);
    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}
