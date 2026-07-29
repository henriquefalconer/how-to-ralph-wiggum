import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { organizations, users, interfaces, interfaceShares } from "@/lib/db/schema";
import {
  grantInterfaceAccess,
  revokeInterfaceAccess,
  updateInterfaceShareRole,
  listInterfaceShares,
  getInterfaceShare,
  canEditPageElements,
  canUpdateEditableField,
  countInterfaceAdmins,
  hasAtLeastOneAdmin,
} from "@/lib/interface-shares";

describe("interface-shares", () => {
  let orgId: string;
  let userId: string;
  let interfaceId: string;

  beforeEach(async () => {
    // Create test org
    const orgResult = await db
      .insert(organizations)
      .values({ name: "Test Org" })
      .returning();
    orgId = orgResult[0].id;

    // Create test user
    const userResult = await db
      .insert(users)
      .values({
        orgId,
        name: "Test User",
        email: "test@example.com",
        isSelf: true,
      })
      .returning();
    userId = userResult[0].id;

    // Create test interface
    const interfaceResult = await db
      .insert(interfaces)
      .values({
        orgId,
        name: "Test Interface",
      })
      .returning();
    interfaceId = interfaceResult[0].id;
  });

  describe("grantInterfaceAccess", () => {
    it("should grant access to a person with admin role", async () => {
      const result = await grantInterfaceAccess(
        interfaceId,
        "person",
        userId,
        "admin"
      );

      expect(result).toBeDefined();
      expect(result.role).toBe("admin");
      expect(result.sharedWithType).toBe("person");
      expect(result.sharedWithId).toBe(userId);
    });

    it("should grant access with member role by default", async () => {
      const result = await grantInterfaceAccess(
        interfaceId,
        "person",
        userId
      );

      expect(result).toBeDefined();
      expect(result.role).toBe("member");
    });

    it("should update role if already granted", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "member");
      const result = await grantInterfaceAccess(
        interfaceId,
        "person",
        userId,
        "admin"
      );

      expect(result.role).toBe("admin");
    });

    it("should grant access to a group", async () => {
      const result = await grantInterfaceAccess(
        interfaceId,
        "group",
        "engineering-team",
        "admin"
      );

      expect(result.sharedWithType).toBe("group");
      expect(result.sharedWithId).toBe("engineering-team");
    });
  });

  describe("revokeInterfaceAccess", () => {
    beforeEach(async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");
    });

    it("should revoke access", async () => {
      await revokeInterfaceAccess(interfaceId, "person", userId);

      const result = await getInterfaceShare(interfaceId, "person", userId);
      expect(result).toBeNull();
    });

    it("should not error if access was not granted", async () => {
      const otherUserId = "non-existent";

      await expect(
        revokeInterfaceAccess(interfaceId, "person", otherUserId)
      ).resolves.not.toThrow();
    });
  });

  describe("updateInterfaceShareRole", () => {
    beforeEach(async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "member");
    });

    it("should update role from member to admin", async () => {
      const result = await updateInterfaceShareRole(
        interfaceId,
        "person",
        userId,
        "admin"
      );

      expect(result.role).toBe("admin");
    });

    it("should update role from admin to member", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");
      const result = await updateInterfaceShareRole(
        interfaceId,
        "person",
        userId,
        "member"
      );

      expect(result.role).toBe("member");
    });
  });

  describe("listInterfaceShares", () => {
    it("should return empty list for new interface", async () => {
      const result = await listInterfaceShares(interfaceId);
      expect(result).toHaveLength(0);
    });

    it("should return all granted shares", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");
      await grantInterfaceAccess(interfaceId, "group", "team-a", "member");

      const result = await listInterfaceShares(interfaceId);
      expect(result).toHaveLength(2);
    });
  });

  describe("getInterfaceShare", () => {
    it("should return null if not granted", async () => {
      const result = await getInterfaceShare(interfaceId, "person", userId);
      expect(result).toBeNull();
    });

    it("should return share if granted", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");

      const result = await getInterfaceShare(interfaceId, "person", userId);
      expect(result).toBeDefined();
      expect(result?.role).toBe("admin");
    });
  });

  describe("canEditPageElements", () => {
    it("should return true for admin role", () => {
      expect(canEditPageElements("admin")).toBe(true);
    });

    it("should return false for member role", () => {
      expect(canEditPageElements("member")).toBe(false);
    });

    it("should return false for null role", () => {
      expect(canEditPageElements(null)).toBe(false);
    });
  });

  describe("canUpdateEditableField", () => {
    it("should return true for admin role regardless of field editability", () => {
      expect(canUpdateEditableField("admin", true)).toBe(true);
      expect(canUpdateEditableField("admin", false)).toBe(true);
    });

    it("should return true for member role if field is editable", () => {
      expect(canUpdateEditableField("member", true)).toBe(true);
    });

    it("should return false for member role if field is not editable", () => {
      expect(canUpdateEditableField("member", false)).toBe(false);
    });

    it("should return false for null role", () => {
      expect(canUpdateEditableField(null, true)).toBe(false);
      expect(canUpdateEditableField(null, false)).toBe(false);
    });
  });

  describe("countInterfaceAdmins", () => {
    it("should return 0 for new interface", async () => {
      const result = await countInterfaceAdmins(interfaceId);
      expect(result).toBe(0);
    });

    it("should count only admin role shares", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");

      const otherUserResult = await db
        .insert(users)
        .values({
          orgId,
          name: "Another User",
          email: "another@example.com",
        })
        .returning();

      await grantInterfaceAccess(
        interfaceId,
        "person",
        otherUserResult[0].id,
        "member"
      );

      const result = await countInterfaceAdmins(interfaceId);
      expect(result).toBe(1);
    });
  });

  describe("hasAtLeastOneAdmin", () => {
    it("should return false for new interface", async () => {
      const result = await hasAtLeastOneAdmin(interfaceId);
      expect(result).toBe(false);
    });

    it("should return true if interface has at least one admin", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");

      const result = await hasAtLeastOneAdmin(interfaceId);
      expect(result).toBe(true);
    });

    it("should return false if all shares are member role", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "member");

      const result = await hasAtLeastOneAdmin(interfaceId);
      expect(result).toBe(false);
    });

    it("should return true if interface has multiple admins", async () => {
      await grantInterfaceAccess(interfaceId, "person", userId, "admin");

      const otherUserResult = await db
        .insert(users)
        .values({
          orgId,
          name: "Another User",
          email: "another@example.com",
        })
        .returning();

      await grantInterfaceAccess(
        interfaceId,
        "person",
        otherUserResult[0].id,
        "admin"
      );

      const result = await hasAtLeastOneAdmin(interfaceId);
      expect(result).toBe(true);
    });
  });
});
