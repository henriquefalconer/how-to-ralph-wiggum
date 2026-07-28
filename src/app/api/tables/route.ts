import { getDefaultOrgId } from "@/lib/pipes";
import { createTable, listTables } from "@/lib/tables";
import { NextResponse } from "next/server";

export async function GET() {
  const orgId = await getDefaultOrgId();
  const tables = await listTables(orgId);
  return NextResponse.json({ tables });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  if (!name.trim()) {
    return NextResponse.json(
      { error: "Table name is required" },
      { status: 400 },
    );
  }

  const orgId = await getDefaultOrgId();
  const table = await createTable(orgId, name);

  return NextResponse.json({ table }, { status: 201 });
}
