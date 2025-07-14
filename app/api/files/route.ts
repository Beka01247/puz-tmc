import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { files, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
  useAccelerateEndpoint: false,
  endpoint: undefined,
});

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

    // Extract S3 key from fileUrl
    const extractS3Key = (fileUrl: string): string | null => {
      try {
        const url = new URL(fileUrl);
        // Remove leading slash and return the path as the key
        return url.pathname.substring(1);
      } catch {
        return null;
      }
    };

    const s3Key = extractS3Key(file.fileUrl);

    // Delete from S3 first
    if (s3Key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: s3Key,
        });

        await s3Client.send(deleteCommand);
        console.log("Successfully deleted file from S3:", s3Key);
      } catch (error) {
        console.warn("Error deleting from S3:", error);
        // Continue with database deletion even if S3 deletion fails
      }
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
