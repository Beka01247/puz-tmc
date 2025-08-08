import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { diagnoses, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { isDoctorRole } from "@/lib/utils/auth";

const diagnosisSchema = z.object({
  description: z.string().min(1, "Описание диагноза обязательно").max(255),
});

const diagnosisIdSchema = z.object({
  id: z.string().uuid("Неверный формат ID"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !session.user?.id || !isDoctorRole(session.user.userType)) {
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
          eq(users.id, resolvedParams.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { description } = diagnosisSchema.parse(body);

    const [newDiagnosis] = await db
      .insert(diagnoses)
      .values({
        userId: resolvedParams.id,
        description,
      })
      .returning({ id: diagnoses.id, description: diagnoses.description });

    return NextResponse.json(newDiagnosis, { status: 201 });
  } catch (error) {
    console.error("Ошибка при добавлении диагноза:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось добавить диагноз" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !session.user?.id || !isDoctorRole(session.user.userType)) {
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
          eq(users.id, resolvedParams.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { diagnoses: newDiagnoses } = z
      .object({ diagnoses: z.array(diagnosisSchema) })
      .parse(body);

    await db.delete(diagnoses).where(eq(diagnoses.userId, resolvedParams.id));

    let updatedDiagnoses: { id: string; description: string }[] = [];
    if (newDiagnoses.length > 0) {
      updatedDiagnoses = await db
        .insert(diagnoses)
        .values(
          newDiagnoses.map(({ description }) => ({
            userId: resolvedParams.id,
            description,
          }))
        )
        .returning({ id: diagnoses.id, description: diagnoses.description });
    }

    return NextResponse.json(updatedDiagnoses, { status: 200 });
  } catch (error) {
    console.error("Ошибка при обновлении диагнозов:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось обновить диагнозы" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !session.user?.id || !isDoctorRole(session.user.userType)) {
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
          eq(users.id, resolvedParams.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { id, description } = z
      .object({
        id: z.string().uuid(),
        description: z.string().min(1, "Описание обязательно").max(255),
      })
      .parse(body);

    const [updatedDiagnosis] = await db
      .update(diagnoses)
      .set({ description, updatedAt: new Date() })
      .where(and(eq(diagnoses.id, id), eq(diagnoses.userId, resolvedParams.id)))
      .returning({ id: diagnoses.id, description: diagnoses.description });

    if (!updatedDiagnosis) {
      return NextResponse.json({ error: "Диагноз не найден" }, { status: 404 });
    }

    return NextResponse.json(updatedDiagnosis, { status: 200 });
  } catch (error) {
    console.error("Ошибка при обновлении диагноза:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось обновить диагноз" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session || !session.user?.id || !isDoctorRole(session.user.userType)) {
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
          eq(users.id, resolvedParams.id),
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      );

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { id } = diagnosisIdSchema.parse(body);

    const [deletedDiagnosis] = await db
      .delete(diagnoses)
      .where(and(eq(diagnoses.id, id), eq(diagnoses.userId, resolvedParams.id)))
      .returning({ id: diagnoses.id, description: diagnoses.description });

    if (!deletedDiagnosis) {
      return NextResponse.json({ error: "Диагноз не найден" }, { status: 404 });
    }

    return NextResponse.json({ message: "Диагноз удален" }, { status: 200 });
  } catch (error) {
    console.error("Ошибка при удалении диагноза:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось удалить диагноз" },
      { status: 500 }
    );
  }
}
