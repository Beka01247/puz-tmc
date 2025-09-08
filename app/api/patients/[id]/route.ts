import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { isMedicalProvider } from "@/lib/utils/auth";
import { canAccessPatient } from "@/lib/utils/patientAccess";

const patientSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  iin: z.string(),
  email: z.string().email(),
  telephone: z.string(),
  city: z.string(),
  organization: z.string(),
  dateOfBirth: z.string().nullable(),
});

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
    const [patient] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        iin: users.iin,
        email: users.email,
        telephone: users.telephone,
        region: users.region,
        city: users.city,
        district: users.district,
        settlement: users.settlement,
        village: users.village,
        organization: users.organization,
        dateOfBirth: users.dateOfBirth,
      })
      .from(users)
      .where(
        and(eq(users.id, resolvedParams.id), eq(users.userType, "PATIENT"))
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    // Check if user can access this patient
    if (
      !canAccessPatient(session.user, {
        region: patient.region || undefined,
        city: patient.city,
        district: patient.district || undefined,
        settlement: patient.settlement || undefined,
        village: patient.village || undefined,
        organization: patient.organization,
      })
    ) {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    const validated = patientSchema.parse(patient);
    return NextResponse.json(validated);
  } catch (error) {
    console.error("GET /patients/[id] error:", error);
    return NextResponse.json(
      {
        error: "Не удалось получить данные пациента",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
