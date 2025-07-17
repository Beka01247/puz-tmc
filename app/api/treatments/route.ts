import { db } from "@/db/drizzle";
import { treatments } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const treatmentSchema = z.object({
  medication: z.string().min(1, "Требуется название медикамента"),
  dosage: z.string().min(1, "Требуется дозировка"),
  frequency: z.string().min(1, "Требуется частота приема"),
  duration: z.string().min(1, "Требуется длительность лечения"),
  notes: z.string().optional(),
});

const updateTreatmentSchema = treatmentSchema.partial().extend({
  id: z.string().uuid("Неверный формат ID"),
});

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  try {
    const data = await db
      .select({
        id: treatments.id,
        patientId: treatments.patientId,
        providerId: treatments.providerId,
        medication: treatments.medication,
        dosage: treatments.dosage,
        frequency: treatments.frequency,
        duration: treatments.duration,
        notes: treatments.notes,
        createdAt: treatments.createdAt,
        updatedAt: treatments.updatedAt,
      })
      .from(treatments)
      .where(eq(treatments.patientId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /treatments error:", error);
    return NextResponse.json(
      { error: "Не удалось получить данные лечения", details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = treatmentSchema.parse(body);

    const [newTreatment] = await db
      .insert(treatments)
      .values({
        patientId: session.user.id,
        providerId: session.user.id, // Assuming the creator is the provider
        medication: validated.medication,
        dosage: validated.dosage,
        frequency: validated.frequency,
        duration: validated.duration,
        notes: validated.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return NextResponse.json(newTreatment);
  } catch (error) {
    console.error("POST /treatments error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось создать запись лечения", details: error },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = updateTreatmentSchema.parse(body);

    const [updatedTreatment] = await db
      .update(treatments)
      .set({
        medication: validated.medication,
        dosage: validated.dosage,
        frequency: validated.frequency,
        duration: validated.duration,
        notes: validated.notes,
        updatedAt: new Date(),
      })
      .where(eq(treatments.id, validated.id))
      .returning();
    if (!updatedTreatment) {
      return NextResponse.json(
        { error: "Лечение не найдено" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedTreatment);
  } catch (error) {
    console.error("PUT /treatments error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось обновить запись лечения", details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Требуется ID" }, { status: 400 });
    }

    const [deletedTreatment] = await db
      .delete(treatments)
      .where(eq(treatments.id, id))
      .returning();
    if (!deletedTreatment) {
      return NextResponse.json(
        { error: "Лечение не найдено" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Лечение удалено" });
  } catch (error) {
    console.error("DELETE /treatments error:", error);
    return NextResponse.json(
      { error: "Не удалось удалить запись лечения", details: error },
      { status: 500 }
    );
  }
}
