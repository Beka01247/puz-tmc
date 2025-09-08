import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { screenings, patientScreenings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { verifyPatientAccess } from "@/lib/utils/patientVerification";
import { isMedicalProvider } from "@/lib/utils/auth";

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (
      !session ||
      !session.user?.id ||
      !isMedicalProvider(session.user.userType)
    ) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    // Verify patient access using new system
    await verifyPatientAccess(resolvedParams.id, session.user);

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
        patientId: resolvedParams.id,
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
    if (
      error instanceof Error &&
      (error.message === "Пациент не найден" ||
        error.message === "Доступ запрещен")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Пациент не найден" ? 404 : 403 }
      );
    }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    // Verify patient access using new system
    await verifyPatientAccess(resolvedParams.id, session.user);

    const body = await request.json();
    const { patientScreeningId, status, result, notes } =
      statusUpdateSchema.parse(body);

    // Check authorization based on status update type
    if (
      (status === "CONFIRMED" || status === "REJECTED") &&
      !isMedicalProvider(session.user.userType)
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
          eq(patientScreenings.patientId, resolvedParams.id)
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
    if (
      error instanceof Error &&
      (error.message === "Пациент не найден" ||
        error.message === "Доступ запрещен")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Пациент не найден" ? 404 : 403 }
      );
    }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    // Verify patient access using new system
    await verifyPatientAccess(resolvedParams.id, session.user);

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
      .where(eq(patientScreenings.patientId, resolvedParams.id));

    return NextResponse.json(patientScreeningsList);
  } catch (error) {
    console.error("Ошибка при получении скринингов:", error);
    if (
      error instanceof Error &&
      (error.message === "Пациент не найден" ||
        error.message === "Доступ запрещен")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Пациент не найден" ? 404 : 403 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось получить скрининги" },
      { status: 500 }
    );
  }
}
