import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { screenings, patientScreenings, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";

const screeningSchema = z.object({
  screeningId: z.string().uuid("Неверный формат ID"),
  scheduledDate: z.string().transform((str) => new Date(str)),
  notes: z.string().optional(),
});

const statusUpdateSchema = z.object({
  patientScreeningId: z.string().uuid("Неверный формат ID"),
  status: z.enum(["COMPLETED", "CANCELLED", "CONFIRMED", "REJECTED"]),
  result: z.string().optional(),
  notes: z.string().optional(),
});

// Create new screening invitation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (
      !session ||
      !session.user?.id ||
      !["DOCTOR", "NURSE"].includes(session.user.userType)
    ) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    const [patient] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, params.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { screeningId, scheduledDate, notes } = screeningSchema.parse(body);

    // Check if screening exists
    const [screening] = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, screeningId));

    if (!screening) {
      return NextResponse.json(
        { error: "Скрининг не найден" },
        { status: 404 }
      );
    }

    // Create new patient screening
    const [newPatientScreening] = await db
      .insert(patientScreenings)
      .values({
        patientId: params.id,
        screeningId,
        providerId: session.user.id,
        scheduledDate: scheduledDate.toISOString().split("T")[0], // Convert to YYYY-MM-DD format
        notes,
        status: "INVITED",
      })
      .returning();

    return NextResponse.json(newPatientScreening, { status: 201 });
  } catch (error) {
    console.error("Ошибка при создании скрининга:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось создать скрининг" },
      { status: 500 }
    );
  }
}

// Update screening status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    const [patient] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, params.id));

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { patientScreeningId, status, result, notes } =
      statusUpdateSchema.parse(body);

    // Check authorization based on status update type
    if (
      (status === "CONFIRMED" || status === "REJECTED") &&
      !["DOCTOR", "NURSE"].includes(session.user.userType)
    ) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    // Check if the screening exists and belongs to the patient
    const [existingScreening] = await db
      .select()
      .from(patientScreenings)
      .where(
        and(
          eq(patientScreenings.id, patientScreeningId),
          eq(patientScreenings.patientId, params.id)
        )
      );

    if (!existingScreening) {
      return NextResponse.json(
        { error: "Скрининг не найден" },
        { status: 404 }
      );
    }

    // Update the screening status
    const updateData: Partial<typeof patientScreenings.$inferInsert> = {
      status,
      notes: notes || existingScreening.notes,
    };

    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
      updateData.result = result;
    } else if (status === "CONFIRMED") {
      updateData.confirmedAt = new Date();
      updateData.confirmedBy = session.user.id;
    }

    const [updatedScreening] = await db
      .update(patientScreenings)
      .set(updateData)
      .where(eq(patientScreenings.id, patientScreeningId))
      .returning();

    return NextResponse.json(updatedScreening);
  } catch (error) {
    console.error("Ошибка при обновлении скрининга:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось обновить скрининг" },
      { status: 500 }
    );
  }
}

// Get patient screenings
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    const [patient] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, params.id));

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const patientScreeningsList = await db
      .select({
        id: patientScreenings.id,
        screeningId: patientScreenings.screeningId,
        customScreeningName: patientScreenings.customScreeningName,
        scheduledDate: patientScreenings.scheduledDate,
        status: patientScreenings.status,
        result: patientScreenings.result,
        notes: patientScreenings.notes,
        completedAt: patientScreenings.completedAt,
        confirmedAt: patientScreenings.confirmedAt,
        confirmedBy: patientScreenings.confirmedBy,
        createdAt: patientScreenings.createdAt,
        screening: {
          id: screenings.id,
          name: screenings.name,
          description: screenings.description,
          testName: screenings.testName,
        },
      })
      .from(patientScreenings)
      .leftJoin(screenings, eq(screenings.id, patientScreenings.screeningId))
      .where(eq(patientScreenings.patientId, params.id));

    return NextResponse.json(patientScreeningsList);
  } catch (error) {
    console.error("Ошибка при получении скринингов:", error);
    return NextResponse.json(
      { error: "Не удалось получить скрининги" },
      { status: 500 }
    );
  }
}
