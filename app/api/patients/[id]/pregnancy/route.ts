import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { pregnancies, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";

const pregnancySchema = z.object({
  lmp: z.string().datetime(),
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
      !["DISTRICT_DOCTOR", "SPECIALIST_DOCTOR", "NURSE"].includes(
        session.user.userType
      )
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
    const { lmp } = pregnancySchema.parse(body);

    const [newPregnancy] = await db
      .insert(pregnancies)
      .values({
        userId: resolvedParams.id,
        lmp,
        status: "active",
      })
      .returning();

    return NextResponse.json(newPregnancy, { status: 201 });
  } catch (error) {
    console.error("Ошибка при добавлении беременности:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось добавить беременность" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();

    console.log("Pregnancy GET request:", {
      patientId: resolvedParams.id,
      userType: session?.user?.userType,
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
    });

    if (
      !session ||
      !session.user?.id ||
      !["DISTRICT_DOCTOR", "SPECIALIST_DOCTOR", "NURSE"].includes(
        session.user.userType
      )
    ) {
      console.log("Pregnancy access denied:", {
        userType: session?.user?.userType,
        allowedTypes: ["DISTRICT_DOCTOR", "SPECIALIST_DOCTOR", "NURSE"],
      });
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    const [pregnancy] = await db
      .select()
      .from(pregnancies)
      .where(
        and(
          eq(pregnancies.userId, resolvedParams.id),
          eq(pregnancies.status, "active")
        )
      );

    console.log("Pregnancy query result:", {
      patientId: resolvedParams.id,
      pregnancyFound: !!pregnancy,
      pregnancy: pregnancy || null,
    });

    return NextResponse.json(pregnancy || null);
  } catch (error) {
    console.error("Ошибка при получении информации о беременности:", error);
    return NextResponse.json(
      { error: "Не удалось получить информацию о беременности" },
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
      !["DISTRICT_DOCTOR", "SPECIALIST_DOCTOR", "NURSE"].includes(
        session.user.userType
      )
    ) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    await db
      .update(pregnancies)
      .set({ status: "completed" })
      .where(
        and(
          eq(pregnancies.userId, resolvedParams.id),
          eq(pregnancies.status, "active")
        )
      );

    return NextResponse.json({ message: "Беременность завершена" });
  } catch (error) {
    console.error("Ошибка при завершении беременности:", error);
    return NextResponse.json(
      { error: "Не удалось завершить беременность" },
      { status: 500 }
    );
  }
}
