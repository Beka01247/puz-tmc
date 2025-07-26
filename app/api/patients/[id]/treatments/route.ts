import { db } from "@/db/drizzle";
import { treatments, users, treatmentTimes } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

const treatmentSchema = z.object({
  medication: z.string().min(1, "Медикамент обязателен"),
  dosage: z.string().min(1, "Дозировка обязательна"),
  frequency: z.string().min(1, "Частота обязательна"),
  duration: z.string().min(1, "Длительность обязательна"),
  notes: z.string().optional(),
  times: z
    .array(
      z.object({
        time: z.string().min(1, "Время обязательно"),
      })
    )
    .min(1, "Добавьте хотя бы одно время приема"),
});

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  try {
    // Verify patient exists and is accessible
    const [patient] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, resolvedParams.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    // Fetch treatments with provider name and times
    const treatmentsData = await db
      .select({
        id: treatments.id,
        medication: treatments.medication,
        dosage: treatments.dosage,
        frequency: treatments.frequency,
        duration: treatments.duration,
        notes: treatments.notes,
        providerName: users.fullName,
      })
      .from(treatments)
      .leftJoin(users, eq(treatments.providerId, users.id))
      .where(eq(treatments.patientId, resolvedParams.id));

    // Fetch treatment times for each treatment
    const treatmentsWithTimes = await Promise.all(
      treatmentsData.map(async (treatment) => {
        const times = await db
          .select({
            id: treatmentTimes.id,
            timeOfDay: treatmentTimes.timeOfDay,
          })
          .from(treatmentTimes)
          .where(eq(treatmentTimes.treatmentId, treatment.id));

        return {
          ...treatment,
          times: times.map((t) => ({ id: t.id, time: t.timeOfDay })),
        };
      })
    );

    return NextResponse.json(treatmentsWithTimes);
  } catch (error) {
    console.error("GET /patients/[id]/treatments error:", error);
    return NextResponse.json(
      { error: "Не удалось получить лечения" },
      { status: 500 }
    );
  }
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const resolvedParams = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  if (!["DOCTOR", "NURSE"].includes(session.user.userType)) {
    return NextResponse.json(
      { error: "Доступ запрещен: требуется роль врача или медсестры" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = treatmentSchema.parse(body);

    const [patient] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, resolvedParams.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const [newTreatment] = await db
      .insert(treatments)
      .values({
        patientId: resolvedParams.id,
        providerId: session.user.id,
        medication: validated.medication,
        dosage: validated.dosage,
        frequency: validated.frequency,
        duration: validated.duration,
        notes: validated.notes,
      })
      .returning();

    // Insert treatment times
    if (validated.times && validated.times.length > 0) {
      await db.insert(treatmentTimes).values(
        validated.times.map((timeItem) => ({
          treatmentId: newTreatment.id,
          timeOfDay: timeItem.time,
        }))
      );
    }

    return NextResponse.json(newTreatment);
  } catch (error) {
    console.error("POST /patients/[id]/treatments error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    const errorMessage =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json(
      { error: "Не удалось создать лечение", details: errorMessage },
      { status: 500 }
    );
  }
};
