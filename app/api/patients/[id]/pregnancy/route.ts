import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { pregnancies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { verifyPatientAccess } from "@/lib/utils/patientVerification";
import { isMedicalProvider } from "@/lib/utils/auth";

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

    if (
      !session ||
      !session.user?.id ||
      !isMedicalProvider(session.user.userType)
    ) {
      console.log("Pregnancy access denied:", {
        userType: session?.user?.userType,
        isMedicalProvider: isMedicalProvider(session?.user?.userType || ""),
      });
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    // Verify patient access using new system
    await verifyPatientAccess(resolvedParams.id, session.user);

    const [pregnancy] = await db
      .select()
      .from(pregnancies)
      .where(
        and(
          eq(pregnancies.userId, resolvedParams.id),
          eq(pregnancies.status, "active")
        )
      );

    return NextResponse.json(pregnancy || null);
  } catch (error) {
    console.error("Ошибка при получении информации о беременности:", error);
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
      !isMedicalProvider(session.user.userType)
    ) {
      return NextResponse.json(
        { error: "Неавторизованный доступ" },
        { status: 401 }
      );
    }

    // Verify patient access using new system
    await verifyPatientAccess(resolvedParams.id, session.user);

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
      { error: "Не удалось завершить беременность" },
      { status: 500 }
    );
  }
}
