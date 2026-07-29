import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { uploadFile, getFile, MAX_FILE_SIZE } from "@/lib/documents";

describe("Documents", () => {
  let orgId: string;

  beforeEach(async () => {
    const [org] = await db
      .insert(organizations)
      .values({ name: "Test Org" })
      .returning();
    orgId = org.id;
  });

  describe("uploadFile", () => {
    it("uploads a valid PDF file", async () => {
      const pdfBuffer = Buffer.from("PDF mock content");
      const file = await uploadFile({
        name: "test.pdf",
        contentType: "application/pdf",
        data: pdfBuffer,
        orgId,
      });

      expect(file.id).toBeTruthy();
      expect(file.name).toBe("test.pdf");
      expect(file.contentType).toBe("application/pdf");
      expect(file.size).toBe(pdfBuffer.length);
      expect(file.orgId).toBe(orgId);
    });

    it("rejects non-PDF files", async () => {
      const csvBuffer = Buffer.from("col1,col2\nval1,val2");
      await expect(
        uploadFile({
          name: "test.csv",
          contentType: "text/csv",
          data: csvBuffer,
          orgId,
        }),
      ).rejects.toThrow("Only PDF files are supported");
    });

    it("rejects files exceeding max size", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE + 1);
      await expect(
        uploadFile({
          name: "huge.pdf",
          contentType: "application/pdf",
          data: oversizedBuffer,
          orgId,
        }),
      ).rejects.toThrow("File size exceeds maximum");
    });

    it("stores file data in database", async () => {
      const pdfBuffer = Buffer.from("PDF content");
      const uploaded = await uploadFile({
        name: "stored.pdf",
        contentType: "application/pdf",
        data: pdfBuffer,
        orgId,
      });

      const retrieved = await getFile(uploaded.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.data).toEqual(pdfBuffer);
    });
  });

  describe("getFile", () => {
    it("retrieves an uploaded file by id", async () => {
      const pdfBuffer = Buffer.from("Retrieve me");
      const uploaded = await uploadFile({
        name: "retrieval.pdf",
        contentType: "application/pdf",
        data: pdfBuffer,
        orgId,
      });

      const retrieved = await getFile(uploaded.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.name).toBe("retrieval.pdf");
      expect(retrieved?.size).toBe(pdfBuffer.length);
    });

    it("returns null for non-existent file", async () => {
      const file = await getFile("non-existent-id");
      expect(file).toBeNull();
    });
  });

  describe("MAX_FILE_SIZE constant", () => {
    it("is set to 5MB", () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
  });
});
