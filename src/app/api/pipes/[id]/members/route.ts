import {
  ensureSelfMembership,
  inviteMember,
  isPipeMemberRole,
  listMembers,
} from "@/lib/pipe-members";
import { getPipeWithPhases } from "@/lib/pipes";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getPipeWithPhases(id);
  if (!result) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  await ensureSelfMembership(result.pipe.orgId, id);
  const members = await listMembers(id);
  return NextResponse.json({ members });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getPipeWithPhases(id);
  if (!result) {
    return NextResponse.json({ error: "Pipe not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const role = typeof body?.role === "string" ? body.role : "";

  if (!isPipeMemberRole(role)) {
    return NextResponse.json(
      { error: "A valid role is required" },
      { status: 400 },
    );
  }

  try {
    const member = await inviteMember(result.pipe.orgId, id, {
      name,
      email,
      role,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to invite" },
      { status: 400 },
    );
  }
}
