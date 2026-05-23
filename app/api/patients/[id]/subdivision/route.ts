import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isMedicalProvider } from "@/lib/utils/auth";
import { verifyPatientAccess } from "@/lib/utils/patientVerification";

// PATCH - Update patient's subdivision (участок)
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

    // Verify patient access
    await verifyPatientAccess(resolvedParams.id, session.user);

    const body = await request.json();
    const { subdivision } = z
      .object({
        subdivision: z.string().nullable(),
      })
      .parse(body);

    // Update subdivision in database
    const [updatedUser] = await db
      .update(users)
      .set({ subdivision })
      .where(eq(users.id, resolvedParams.id))
      .returning({ id: users.id, subdivision: users.subdivision });

    if (!updatedUser) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    return NextResponse.json(
      { subdivision: updatedUser.subdivision },
      { status: 200 }
    );
  } catch (error) {
    console.error("Ошибка при обновлении участка:", error);
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
      { error: "Не удалось обновить участок" },
      { status: 500 }
    );
  }
}
