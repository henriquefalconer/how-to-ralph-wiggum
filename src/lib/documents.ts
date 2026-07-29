import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type File = typeof files.$inferSelect;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileInput {
  name: string;
  contentType: string;
  data: Buffer;
  orgId: string;
}

export async function uploadFile(input: FileInput): Promise<File> {
  if (input.data.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
  }

  if (!input.contentType.includes("pdf")) {
    throw new Error("Only PDF files are supported");
  }

  const [file] = await db
    .insert(files)
    .values({
      orgId: input.orgId,
      name: input.name,
      contentType: input.contentType,
      size: input.data.length,
      data: input.data,
    })
    .returning();

  return file;
}

export async function getFile(id: string): Promise<File | null> {
  const [file] = await db.select().from(files).where(eq(files.id, id));
  return file ?? null;
}

export async function deleteFile(id: string): Promise<void> {
  await db.delete(files).where(eq(files.id, id));
}
