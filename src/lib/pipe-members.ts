import { db } from "@/lib/db";
import { pipeMemberRoles, pipeMembers, users } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type PipeMember = typeof pipeMembers.$inferSelect;
export type User = typeof users.$inferSelect;
export type PipeMemberRole = (typeof pipeMemberRoles)[number];

export function isPipeMemberRole(value: string): value is PipeMemberRole {
  return (pipeMemberRoles as readonly string[]).includes(value);
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

// restricted_view may create/edit its own cards but never delete any card;
// read_only may view/comment but never mutate a field value. Everyone else
// (pipe_member, pipe_admin) has full card CRUD.
const ROLE_CAN_DELETE_CARD: Record<PipeMemberRole, boolean> = {
  pipe_admin: true,
  pipe_member: true,
  read_only: false,
  restricted_view: false,
};

const ROLE_CAN_EDIT_FIELD_VALUES: Record<PipeMemberRole, boolean> = {
  pipe_admin: true,
  pipe_member: true,
  read_only: false,
  restricted_view: true,
};

export interface PipeMemberWithUser extends PipeMember {
  user: User;
}

export async function getOrCreateSelfUser(orgId: string): Promise<User> {
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.isSelf, true)));
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      orgId,
      name: "You",
      email: "you@workspace.local",
      isSelf: true,
    })
    .returning();
  return created;
}

// A pipe always has the implicit self user as a member (mirrors the real
// product: whoever created/opened the pipe is always listed). Auto-provision
// it as pipe_admin the first time this pipe's members are viewed.
export async function ensureSelfMembership(
  orgId: string,
  pipeId: string,
): Promise<PipeMemberWithUser> {
  const self = await getOrCreateSelfUser(orgId);

  const [existing] = await db
    .select()
    .from(pipeMembers)
    .where(
      and(eq(pipeMembers.pipeId, pipeId), eq(pipeMembers.userId, self.id)),
    );
  if (existing) {
    return { ...existing, user: self };
  }

  const now = new Date();
  const [created] = await db
    .insert(pipeMembers)
    .values({
      pipeId,
      userId: self.id,
      role: "pipe_admin",
      invitedAt: now,
      joinedAt: now,
    })
    .returning();

  return { ...created, user: self };
}

export async function listMembers(
  pipeId: string,
): Promise<PipeMemberWithUser[]> {
  const rows = await db
    .select({ member: pipeMembers, user: users })
    .from(pipeMembers)
    .innerJoin(users, eq(pipeMembers.userId, users.id))
    .where(eq(pipeMembers.pipeId, pipeId))
    .orderBy(asc(pipeMembers.invitedAt));

  return rows.map((row) => ({ ...row.member, user: row.user }));
}

export async function getMember(
  memberId: string,
): Promise<PipeMemberWithUser | null> {
  const [row] = await db
    .select({ member: pipeMembers, user: users })
    .from(pipeMembers)
    .innerJoin(users, eq(pipeMembers.userId, users.id))
    .where(eq(pipeMembers.id, memberId));
  if (!row) return null;
  return { ...row.member, user: row.user };
}

export async function getMemberRole(
  pipeId: string,
  userId: string,
): Promise<PipeMemberRole | null> {
  const [row] = await db
    .select({ role: pipeMembers.role })
    .from(pipeMembers)
    .where(and(eq(pipeMembers.pipeId, pipeId), eq(pipeMembers.userId, userId)));
  return (row?.role as PipeMemberRole | undefined) ?? null;
}

export function assertCanDeleteCard(
  role: PipeMemberRole | null,
  restrictToAdmin = false,
): void {
  if (!role || !ROLE_CAN_DELETE_CARD[role]) {
    throw new AuthorizationError(
      "This role does not have permission to delete cards",
    );
  }
  if (restrictToAdmin && role !== "pipe_admin") {
    throw new AuthorizationError(
      "Only pipe admins may delete cards in this pipe",
    );
  }
}

export function assertCanEditFieldValues(role: PipeMemberRole | null): void {
  if (!role || !ROLE_CAN_EDIT_FIELD_VALUES[role]) {
    throw new AuthorizationError(
      "This role does not have permission to edit field values",
    );
  }
}

export interface InviteMemberInput {
  name: string;
  email: string;
  role: PipeMemberRole;
}

export async function inviteMember(
  orgId: string,
  pipeId: string,
  input: InviteMemberInput,
): Promise<PipeMemberWithUser> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) {
    throw new Error("Name is required");
  }
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }
  if (!isPipeMemberRole(input.role)) {
    throw new Error(`Unknown role: ${input.role}`);
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.email, email)));

  const user =
    existingUser ??
    (await db.insert(users).values({ orgId, name, email }).returning())[0];

  const [alreadyMember] = await db
    .select({ id: pipeMembers.id })
    .from(pipeMembers)
    .where(
      and(eq(pipeMembers.pipeId, pipeId), eq(pipeMembers.userId, user.id)),
    );
  if (alreadyMember) {
    throw new Error("This person is already a member of the pipe");
  }

  const now = new Date();
  const [member] = await db
    .insert(pipeMembers)
    .values({
      pipeId,
      userId: user.id,
      role: input.role,
      invitedAt: now,
      joinedAt: now,
    })
    .returning();

  return { ...member, user };
}

export async function updateMemberRole(
  memberId: string,
  role: string,
): Promise<PipeMemberWithUser> {
  if (!isPipeMemberRole(role)) {
    throw new Error(`Unknown role: ${role}`);
  }

  const existing = await getMember(memberId);
  if (!existing) {
    throw new Error("Member not found");
  }

  if (existing.role === "pipe_admin" && role !== "pipe_admin") {
    await assertNotLastAdmin(existing.pipeId, memberId);
  }

  const [updated] = await db
    .update(pipeMembers)
    .set({ role })
    .where(eq(pipeMembers.id, memberId))
    .returning();

  return { ...updated, user: existing.user };
}

async function assertNotLastAdmin(
  pipeId: string,
  excludingMemberId: string,
): Promise<void> {
  const admins = await db
    .select({ id: pipeMembers.id })
    .from(pipeMembers)
    .where(
      and(eq(pipeMembers.pipeId, pipeId), eq(pipeMembers.role, "pipe_admin")),
    );
  const remaining = admins.filter((a) => a.id !== excludingMemberId);
  if (remaining.length === 0) {
    throw new Error("A pipe must always have at least one admin");
  }
}

export async function removeMember(memberId: string): Promise<void> {
  const existing = await getMember(memberId);
  if (!existing) {
    throw new Error("Member not found");
  }
  if (existing.role === "pipe_admin") {
    await assertNotLastAdmin(existing.pipeId, memberId);
  }

  await db.delete(pipeMembers).where(eq(pipeMembers.id, memberId));
}
