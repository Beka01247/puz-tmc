import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { riskGroups, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { isMedicalProvider } from "@/lib/utils/auth";

const riskGroupSchema = z.object({
  name: z.string().min(1, "Название группы обязательно").max(255),
});

const riskGroupIdSchema = z.object({
  id: z.string().uuid("Неверный формат ID"),
});

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
    const { name } = riskGroupSchema.parse(body);

    const [newRiskGroup] = await db
      .insert(riskGroups)
      .values({
        userId: resolvedParams.id,
        name,
      })
      .returning({ id: riskGroups.id, name: riskGroups.name });

    return NextResponse.json(newRiskGroup, { status: 201 });
  } catch (error) {
    console.error("Ошибка при добавлении группы:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось добавить группу риска" },
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
    const { riskGroups: newRiskGroups } = z
      .object({ riskGroups: z.array(riskGroupSchema) })
      .parse(body);

    await db.delete(riskGroups).where(eq(riskGroups.userId, resolvedParams.id));

    let updatedRiskGroups: { id: string; name: string }[] = [];
    if (newRiskGroups.length > 0) {
      updatedRiskGroups = await db
        .insert(riskGroups)
        .values(
          newRiskGroups.map(({ name }) => ({
            userId: resolvedParams.id,
            name,
          }))
        )
        .returning({ id: riskGroups.id, name: riskGroups.name });
    }

    return NextResponse.json(updatedRiskGroups, { status: 200 });
  } catch (error) {
    console.error("Ошибка при обновлении групп риска:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось обновить группы" },
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
    const { id, name } = z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1, "Название обязательно").max(255),
      })
      .parse(body);

    const [updatedRiskGroup] = await db
      .update(riskGroups)
      .set({ name, updatedAt: new Date() })
      .where(
        and(eq(riskGroups.id, id), eq(riskGroups.userId, resolvedParams.id))
      )
      .returning({ id: riskGroups.id, name: riskGroups.name });

    if (!updatedRiskGroup) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    return NextResponse.json(updatedRiskGroup, { status: 200 });
  } catch (error) {
    console.error("Ошибка при обновлении группы:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось обновить группу риска" },
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
    const { id } = riskGroupIdSchema.parse(body);

    const [deletedRiskGroup] = await db
      .delete(riskGroups)
      .where(
        and(eq(riskGroups.id, id), eq(riskGroups.userId, resolvedParams.id))
      )
      .returning({ id: riskGroups.id, name: riskGroups.name });

    if (!deletedRiskGroup) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    return NextResponse.json({ message: "Группа удалена" }, { status: 200 });
  } catch (error) {
    console.error("Ошибка при удалении группы:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось удалить группу риска" },
      { status: 500 }
    );
  }
}
