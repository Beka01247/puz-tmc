import { db } from "@/db/drizzle";
import { treatmentLogs, treatments, users } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

const treatmentLogSchema = z.object({
  treatmentTimeId: z.string().uuid(),
  treatmentId: z.string().uuid(),
  logDate: z.string(),
  isTaken: z.boolean(),
  takenAt: z.string().nullable().optional(),
  notes: z.string().optional(),
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
    // Verify access to patient
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

    if (!patient && session.user.id !== resolvedParams.id) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    // Fetch treatment logs for the patient
    const logs = await db
      .select({
        id: treatmentLogs.id,
        treatmentTimeId: treatmentLogs.treatmentTimeId,
        logDate: treatmentLogs.logDate,
        isTaken: treatmentLogs.isTaken,
        takenAt: treatmentLogs.takenAt,
        notes: treatmentLogs.notes,
      })
      .from(treatmentLogs)
      .innerJoin(treatments, eq(treatmentLogs.treatmentId, treatments.id))
      .where(eq(treatments.patientId, resolvedParams.id));

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /patients/[id]/treatment-logs error:", error);
    return NextResponse.json(
      { error: "Не удалось получить записи о лечении" },
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

  try {
    const body = await request.json();
    const validated = treatmentLogSchema.parse(body);

    // Verify access to patient
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

    if (!patient && session.user.id !== resolvedParams.id) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    // Verify treatment belongs to patient
    const [treatment] = await db
      .select({ id: treatments.id })
      .from(treatments)
      .where(
        and(
          eq(treatments.id, validated.treatmentId),
          eq(treatments.patientId, resolvedParams.id)
        )
      );

    if (!treatment) {
      return NextResponse.json(
        { error: "Лечение не найдено" },
        { status: 404 }
      );
    }

    // Check if log already exists for this date and treatment time
    const [existingLog] = await db
      .select({ id: treatmentLogs.id })
      .from(treatmentLogs)
      .where(
        and(
          eq(treatmentLogs.treatmentTimeId, validated.treatmentTimeId),
          eq(treatmentLogs.logDate, validated.logDate)
        )
      );

    if (existingLog) {
      // Update existing log
      const [updatedLog] = await db
        .update(treatmentLogs)
        .set({
          isTaken: validated.isTaken,
          takenAt: validated.takenAt ? new Date(validated.takenAt) : null,
          notes: validated.notes,
          updatedAt: new Date(),
        })
        .where(eq(treatmentLogs.id, existingLog.id))
        .returning();

      return NextResponse.json(updatedLog);
    } else {
      // Create new log
      const [newLog] = await db
        .insert(treatmentLogs)
        .values({
          treatmentId: validated.treatmentId,
          treatmentTimeId: validated.treatmentTimeId,
          logDate: validated.logDate,
          isTaken: validated.isTaken,
          takenAt: validated.takenAt ? new Date(validated.takenAt) : null,
          notes: validated.notes,
        })
        .returning();

      return NextResponse.json(newLog);
    }
  } catch (error) {
    console.error("POST /patients/[id]/treatment-logs error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось создать запись о лечении" },
      { status: 500 }
    );
  }
};
