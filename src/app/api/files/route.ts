import { uploadFile } from "@/lib/documents";
import { getDefaultOrgId } from "@/lib/pipes";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const orgId = await getDefaultOrgId();
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    if (!file.type.includes("pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const uploadedFile = await uploadFile({
      name: file.name,
      contentType: file.type,
      data: Buffer.from(buffer),
      orgId,
    });

    return NextResponse.json({
      id: uploadedFile.id,
      name: uploadedFile.name,
      size: uploadedFile.size,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
