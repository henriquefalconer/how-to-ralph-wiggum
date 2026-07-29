import { db } from "@/lib/db";
import {
  interfaces,
  interfaceShares,
  interfaceShareRoles,
  type interfaceShareRoles as interfaceShareRolesType,
  users,
} from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export type InterfaceShareRole =
  (typeof interfaceShareRoles)[number];

export async function grantInterfaceAccess(
  interfaceId: string,
  sharedWithType: "person" | "group",
  sharedWithId: string,
  role: InterfaceShareRole = "member",
) {
  const existing = await db
    .select()
    .from(interfaceShares)
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.sharedWithType, sharedWithType),
        eq(interfaceShares.sharedWithId, sharedWithId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Already granted, just update role if different
    if (existing[0].role !== role) {
      await db
        .update(interfaceShares)
        .set({ role })
        .where(
          and(
            eq(interfaceShares.interfaceId, interfaceId),
            eq(interfaceShares.sharedWithType, sharedWithType),
            eq(interfaceShares.sharedWithId, sharedWithId),
          ),
        );
    }
    return existing[0];
  }

  await db.insert(interfaceShares).values({
    interfaceId,
    sharedWithType,
    sharedWithId,
    role,
  });

  return db
    .select()
    .from(interfaceShares)
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.sharedWithType, sharedWithType),
        eq(interfaceShares.sharedWithId, sharedWithId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
}

export async function revokeInterfaceAccess(
  interfaceId: string,
  sharedWithType: "person" | "group",
  sharedWithId: string,
) {
  await db
    .delete(interfaceShares)
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.sharedWithType, sharedWithType),
        eq(interfaceShares.sharedWithId, sharedWithId),
      ),
    );
}

export async function updateInterfaceShareRole(
  interfaceId: string,
  sharedWithType: "person" | "group",
  sharedWithId: string,
  role: InterfaceShareRole,
) {
  await db
    .update(interfaceShares)
    .set({ role })
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.sharedWithType, sharedWithType),
        eq(interfaceShares.sharedWithId, sharedWithId),
      ),
    );

  return db
    .select()
    .from(interfaceShares)
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.sharedWithType, sharedWithType),
        eq(interfaceShares.sharedWithId, sharedWithId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
}

export async function listInterfaceShares(interfaceId: string) {
  return db
    .select()
    .from(interfaceShares)
    .where(eq(interfaceShares.interfaceId, interfaceId));
}

export async function getInterfaceShare(
  interfaceId: string,
  sharedWithType: "person" | "group",
  sharedWithId: string,
) {
  return db
    .select()
    .from(interfaceShares)
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.sharedWithType, sharedWithType),
        eq(interfaceShares.sharedWithId, sharedWithId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] || null);
}

export function canEditPageElements(role: InterfaceShareRole | null): boolean {
  return role === "admin";
}

export function canUpdateEditableField(
  role: InterfaceShareRole | null,
  fieldIsEditable: boolean,
): boolean {
  // Members can update editable fields; admins can always update
  return fieldIsEditable || role === "admin";
}

export async function countInterfaceAdmins(interfaceId: string): Promise<number> {
  const result = await db
    .select()
    .from(interfaceShares)
    .where(
      and(
        eq(interfaceShares.interfaceId, interfaceId),
        eq(interfaceShares.role, "admin"),
      ),
    );

  return result.length;
}

export async function hasAtLeastOneAdmin(
  interfaceId: string,
): Promise<boolean> {
  const count = await countInterfaceAdmins(interfaceId);
  return count > 0;
}
