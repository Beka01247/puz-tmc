import { db } from "@/db/drizzle";
import { measurements } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isMedicalProvider } from "@/lib/utils/auth";
import { verifyPatientAccess } from "@/lib/utils/patientVerification";

const measurementSchema = z.array(
  z.object({
    id: z.string().uuid(),
    type: z.string(),
    value1: z.string(),
    value2: z.string().nullable(),
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
    // Verify patient access
    await verifyPatientAccess(resolvedParams.id, session.user);

    const data = await db
      .select({
        id: measurements.id,
        type: measurements.type,
        value1: measurements.value1,
        value2: measurements.value2,
        createdAt: measurements.createdAt,
      })
      .from(measurements)
      .where(eq(measurements.userId, resolvedParams.id));

    const validated = measurementSchema.parse(
      data.map((item) => ({
        ...item,
        createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
    return NextResponse.json(validated);
  } catch (error) {
    console.error("GET /patients/[id]/measurements error:", error);

    if (error instanceof Error) {
      if (error.message === "Пациент не найден") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Доступ запрещен") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      {
        error: "Не удалось получить данные мониторинга",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
