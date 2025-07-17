import { db } from "@/db/drizzle";
import { consultations } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const consultationSchema = z.object({
  providerId: z.string().uuid("Неверный формат ID провайдера"),
  consultationDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Неверный формат даты",
  }),
  notes: z.string().optional(),
  status: z
    .enum(["SCHEDULED", "COMPLETED", "CANCELLED"], {
      errorMap: () => ({ message: "Неверный статус консультации" }),
    })
    .optional(),
});

const updateConsultationSchema = consultationSchema.partial().extend({
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
        id: consultations.id,
        patientId: consultations.patientId,
        providerId: consultations.providerId,
        consultationDate: consultations.consultationDate,
        notes: consultations.notes,
        status: consultations.status,
        createdAt: consultations.createdAt,
        updatedAt: consultations.updatedAt,
      })
      .from(consultations)
      .where(eq(consultations.patientId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /consultations error:", error);
    return NextResponse.json(
      { error: "Не удалось получить консультации", details: error },
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
    const validated = consultationSchema.parse(body);

    const [newConsultation] = await db
      .insert(consultations)
      .values({
        patientId: session.user.id,
        providerId: validated.providerId,
        consultationDate: new Date(validated.consultationDate),
        notes: validated.notes,
        status: validated.status ?? "SCHEDULED",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return NextResponse.json(newConsultation);
  } catch (error) {
    console.error("POST /consultations error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось создать консультацию", details: error },
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
    const validated = updateConsultationSchema.parse(body);

    const [updatedConsultation] = await db
      .update(consultations)
      .set({
        providerId: validated.providerId,
        consultationDate: validated.consultationDate
          ? new Date(validated.consultationDate)
          : undefined,
        notes: validated.notes,
        status: validated.status,
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, validated.id))
      .returning();
    if (!updatedConsultation) {
      return NextResponse.json(
        { error: "Консультация не найдена" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedConsultation);
  } catch (error) {
    console.error("PUT /consultations error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось обновить консультацию", details: error },
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

    const [deletedConsultation] = await db
      .delete(consultations)
      .where(eq(consultations.id, id))
      .returning();
    if (!deletedConsultation) {
      return NextResponse.json(
        { error: "Консультация не найдена" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Консультация удалена" });
  } catch (error) {
    console.error("DELETE /consultations error:", error);
    return NextResponse.json(
      { error: "Не удалось удалить консультацию", details: error },
      { status: 500 }
    );
  }
}
