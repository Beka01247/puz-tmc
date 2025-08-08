import { db } from "@/db/drizzle";
import { files, users } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { isMedicalProvider } from "@/lib/utils/auth";

const fileSchema = z.array(
  z.object({
    id: z.string().uuid(),
    fileName: z.string(),
    fileUrl: z.string(),
    description: z.string().nullable(),
    uploadedBy: z.string().nullable(),
    createdAt: z.string(),
  })
);

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  if (!isMedicalProvider(session.user.userType)) {
    return NextResponse.json(
      { error: "Доступ запрещен: требуется роль врача или медсестры" },
      { status: 403 }
    );
  }

  try {
    const data = await db
      .select({
        id: files.id,
        fileName: files.fileName,
        fileUrl: files.fileUrl,
        description: files.description,
        uploadedBy: users.fullName,
        createdAt: files.createdAt,
      })
      .from(files)
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .where(
        and(
          eq(files.patientId, resolvedParams.id),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    const validated = fileSchema.parse(
      data.map((item) => ({
        ...item,
        createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
    return NextResponse.json(validated);
  } catch (error) {
    console.error("GET /patients/[id]/files error:", error);
    return NextResponse.json(
      {
        error: "Не удалось получить файлы",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
