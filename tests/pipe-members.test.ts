import { createCard, deleteCard, updateCardFieldValue } from "@/lib/cards";
import { db } from "@/lib/db";
import { cardFieldValues, cards, organizations, phases } from "@/lib/db/schema";
import { createField } from "@/lib/fields";
import { dictionaries } from "@/lib/i18n/dictionaries";
import {
  AuthorizationError,
  ensureSelfMembership,
  getMember,
  inviteMember,
  listMembers,
  removeMember,
  updateMemberRole,
} from "@/lib/pipe-members";
import { createPipe, updatePipeSettings } from "@/lib/pipes";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

async function pipePhases(pipeId: string) {
  return db
    .select()
    .from(phases)
    .where(eq(phases.pipeId, pipeId))
    .orderBy(asc(phases.position));
}

describe("pipe-members", () => {
  let orgId: string;

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org (pipe-members.test.ts)" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  async function makePipe(name: string) {
    return createPipe(orgId, name, dictionaries.en.defaultPhase);
  }

  it("rejects an invite with no name", async () => {
    const pipe = await makePipe("No Name Pipe");
    await expect(
      inviteMember(orgId, pipe.id, {
        name: "  ",
        email: "a@example.com",
        role: "pipe_member",
      }),
    ).rejects.toThrow(/name/i);
  });

  it("rejects an invite with an invalid email", async () => {
    const pipe = await makePipe("Bad Email Pipe");
    await expect(
      inviteMember(orgId, pipe.id, {
        name: "Ana",
        email: "not-an-email",
        role: "pipe_member",
      }),
    ).rejects.toThrow(/email/i);
  });

  it("rejects an invite with an unknown role", async () => {
    const pipe = await makePipe("Bad Role Pipe");
    await expect(
      inviteMember(orgId, pipe.id, {
        name: "Ana",
        email: "ana@example.com",
        // biome-ignore lint/suspicious/noExplicitAny: exercising the runtime guard
        role: "owner" as any,
      }),
    ).rejects.toThrow(/role/i);
  });

  it("invites a member, sets joinedAt, and lists them", async () => {
    const pipe = await makePipe("Invite Pipe");
    const member = await inviteMember(orgId, pipe.id, {
      name: "Ana Souza",
      email: "ana.souza@example.com",
      role: "read_only",
    });

    expect(member.role).toBe("read_only");
    expect(member.joinedAt).not.toBeNull();
    expect(member.user.email).toBe("ana.souza@example.com");

    const members = await listMembers(pipe.id);
    expect(members.map((m) => m.id)).toContain(member.id);
  });

  it("reuses an existing user row when the same email is invited to another pipe", async () => {
    const pipeA = await makePipe("Reuse Pipe A");
    const pipeB = await makePipe("Reuse Pipe B");

    const memberA = await inviteMember(orgId, pipeA.id, {
      name: "Bruno",
      email: "bruno@example.com",
      role: "pipe_member",
    });
    const memberB = await inviteMember(orgId, pipeB.id, {
      name: "Bruno",
      email: "bruno@example.com",
      role: "pipe_admin",
    });

    expect(memberB.user.id).toBe(memberA.user.id);
  });

  it("rejects inviting the same email to the same pipe twice", async () => {
    const pipe = await makePipe("Double Invite Pipe");
    await inviteMember(orgId, pipe.id, {
      name: "Caio",
      email: "caio@example.com",
      role: "pipe_member",
    });
    await expect(
      inviteMember(orgId, pipe.id, {
        name: "Caio",
        email: "caio@example.com",
        role: "pipe_member",
      }),
    ).rejects.toThrow(/already/i);
  });

  it("auto-provisions the self user as pipe_admin, idempotently", async () => {
    const pipe = await makePipe("Self Pipe");
    const first = await ensureSelfMembership(orgId, pipe.id);
    expect(first.role).toBe("pipe_admin");
    expect(first.user.isSelf).toBe(true);

    const second = await ensureSelfMembership(orgId, pipe.id);
    expect(second.id).toBe(first.id);

    const members = await listMembers(pipe.id);
    expect(members.filter((m) => m.user.isSelf).length).toBe(1);
  });

  it("updates a member's role and persists it", async () => {
    const pipe = await makePipe("Role Update Pipe");
    const member = await inviteMember(orgId, pipe.id, {
      name: "Duda",
      email: "duda@example.com",
      role: "pipe_member",
    });

    const updated = await updateMemberRole(member.id, "restricted_view");
    expect(updated.role).toBe("restricted_view");

    const fetched = await getMember(member.id);
    expect(fetched?.role).toBe("restricted_view");
  });

  it("rejects updating a member to an unknown role", async () => {
    const pipe = await makePipe("Bad Role Update Pipe");
    const member = await inviteMember(orgId, pipe.id, {
      name: "Eva",
      email: "eva@example.com",
      role: "pipe_member",
    });
    await expect(updateMemberRole(member.id, "superadmin")).rejects.toThrow(
      /role/i,
    );
  });

  it("blocks removing or demoting a pipe's only admin", async () => {
    const pipe = await makePipe("Last Admin Pipe");
    const admin = await ensureSelfMembership(orgId, pipe.id);

    await expect(updateMemberRole(admin.id, "pipe_member")).rejects.toThrow(
      /admin/i,
    );
    await expect(removeMember(admin.id)).rejects.toThrow(/admin/i);
  });

  it("allows removing an admin when another admin remains", async () => {
    const pipe = await makePipe("Two Admins Pipe");
    const admin1 = await ensureSelfMembership(orgId, pipe.id);
    const admin2 = await inviteMember(orgId, pipe.id, {
      name: "Fatima",
      email: "fatima@example.com",
      role: "pipe_admin",
    });

    await removeMember(admin1.id);
    const fetched = await getMember(admin2.id);
    expect(fetched).not.toBeNull();
    expect(await getMember(admin1.id)).toBeNull();
  });

  it("restricted_view role cannot delete cards, even ones it created", async () => {
    const pipe = await makePipe("Restricted Delete Pipe");
    const [inbox] = await pipePhases(pipe.id);
    const titleField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
      required: false,
    });
    const card = await createCard(pipe.id, inbox.id, {
      [titleField.id]: "Task 1",
    });

    const restricted = await inviteMember(orgId, pipe.id, {
      name: "Restricted User",
      email: "restricted@example.com",
      role: "restricted_view",
    });

    await expect(deleteCard(card.id, restricted.user.id)).rejects.toThrow(
      AuthorizationError,
    );

    const stillThere = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    expect(stillThere.length).toBe(1);
  });

  it("read_only role cannot edit card field values", async () => {
    const pipe = await makePipe("Read Only Edit Pipe");
    const [inbox] = await pipePhases(pipe.id);
    const titleField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const field = await createField("phase", inbox.id, {
      label: "Notes",
      type: "short_text",
      required: false,
    });
    const card = await createCard(pipe.id, inbox.id, {
      [titleField.id]: "Task 1",
    });

    const readOnly = await inviteMember(orgId, pipe.id, {
      name: "Read Only User",
      email: "readonly@example.com",
      role: "read_only",
    });

    await expect(
      updateCardFieldValue(card.id, field.id, "hello", readOnly.user.id),
    ).rejects.toThrow(AuthorizationError);

    const values = await db
      .select()
      .from(cardFieldValues)
      .where(eq(cardFieldValues.cardId, card.id));
    expect(values.find((v) => v.fieldId === field.id)).toBeUndefined();
  });

  it("pipe_admin can delete cards and edit field values", async () => {
    const pipe = await makePipe("Admin Full Access Pipe");
    const [inbox] = await pipePhases(pipe.id);
    const titleField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const field = await createField("phase", inbox.id, {
      label: "Notes",
      type: "short_text",
      required: false,
    });
    const card = await createCard(pipe.id, inbox.id, {
      [titleField.id]: "Task 1",
    });

    const admin = await inviteMember(orgId, pipe.id, {
      name: "Admin User",
      email: "admin-full@example.com",
      role: "pipe_admin",
    });

    await updateCardFieldValue(card.id, field.id, "hello", admin.user.id);
    const values = await db
      .select()
      .from(cardFieldValues)
      .where(eq(cardFieldValues.cardId, card.id));
    expect(values.find((v) => v.fieldId === field.id)?.value).toBe("hello");

    await deleteCard(card.id, admin.user.id);
    const remaining = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    expect(remaining.length).toBe(0);
  });

  it("removes a member", async () => {
    const pipe = await makePipe("Remove Member Pipe");
    const member = await inviteMember(orgId, pipe.id, {
      name: "Gustavo",
      email: "gustavo@example.com",
      role: "pipe_member",
    });

    await removeMember(member.id);
    expect(await getMember(member.id)).toBeNull();
  });

  it("restrictDeleteToAdmin blocks a plain pipe_member from deleting cards", async () => {
    const pipe = await makePipe("Restrict Delete To Admin Pipe");
    const [inbox] = await pipePhases(pipe.id);
    const titleField = await createField("start_form", pipe.id, {
      label: "Title",
      type: "short_text",
    });
    const card = await createCard(pipe.id, inbox.id, {
      [titleField.id]: "Task 1",
    });

    const member = await inviteMember(orgId, pipe.id, {
      name: "Plain Member",
      email: "plain-member@example.com",
      role: "pipe_member",
    });

    await updatePipeSettings(pipe.id, { restrictDeleteToAdmin: true });

    await expect(deleteCard(card.id, member.user.id)).rejects.toThrow(
      AuthorizationError,
    );

    const admin = await ensureSelfMembership(orgId, pipe.id);
    await deleteCard(card.id, admin.user.id);
    const remaining = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    expect(remaining.length).toBe(0);
  });
});
