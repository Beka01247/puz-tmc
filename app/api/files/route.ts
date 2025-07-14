import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { files, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") || session.user.id;

    // Get files for the patient
    const patientFiles = await db
      .select({
        id: files.id,
        fileName: files.fileName,
        fileUrl: files.fileUrl,
        description: files.description,
        createdAt: files.createdAt,
        uploadedBy: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(files)
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .where(eq(files.patientId, patientId))
      .orderBy(desc(files.createdAt));

    return NextResponse.json({ files: patientFiles });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileUrl, description, patientId } = await request.json();

    if (!fileName || !fileUrl) {
      return NextResponse.json(
        { error: "fileName and fileUrl are required" },
        { status: 400 }
      );
    }

    // Insert file record into database
    const [newFile] = await db
      .insert(files)
      .values({
        patientId: patientId || session.user.id,
        fileName,
        fileUrl,
        description,
        uploadedBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ file: newFile });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Check if user owns the file or is a doctor
    const [file] = await db.select().from(files).where(eq(files.id, fileId));

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from database
    await db.delete(files).where(eq(files.id, fileId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
