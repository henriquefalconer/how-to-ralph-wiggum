import { getInterface, listPages } from "@/lib/interfaces";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const iface = await getInterface(id);
  if (!iface) {
    return NextResponse.json({ error: "Interface not found" }, { status: 404 });
  }
  const pages = await listPages(id);
  return NextResponse.json({ interface: iface, pages });
}
