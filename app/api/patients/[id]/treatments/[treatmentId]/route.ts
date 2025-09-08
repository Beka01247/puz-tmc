import { db } from "@/db/drizzle";
import { treatments, treatmentTimes, treatmentLogs } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { isMedicalProvider } from "@/lib/utils/auth";
import { verifyPatientAccess } from "@/lib/utils/patientVerification";

export const DELETE = async (
  _: Request,
  { params }: { params: Promise<{ id: string; treatmentId: string }> }
) => {
  const resolvedParams = await params;
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  if (!isMedicalProvider(session.user.userType)) {
    return NextResponse.json(
      { error: "Доступ запрещен: требуется роль врача или медсестры" },
      { status: 403 }
    );
  }

  try {
    const patientId = resolvedParams.id;
    const treatmentId = resolvedParams.treatmentId;

    // Verify patient access using new system
    await verifyPatientAccess(patientId, session.user);

    // Verify treatment exists and belongs to the patient
    const [treatment] = await db
      .select({ id: treatments.id })
      .from(treatments)
      .where(
        and(eq(treatments.id, treatmentId), eq(treatments.patientId, patientId))
      );

    if (!treatment) {
      return NextResponse.json(
        { error: "Лечение не найдено" },
        { status: 404 }
      );
    }

    // Delete treatment logs first (due to foreign key constraints)
    await db
      .delete(treatmentLogs)
      .where(eq(treatmentLogs.treatmentId, treatmentId));

    // Delete treatment times
    await db
      .delete(treatmentTimes)
      .where(eq(treatmentTimes.treatmentId, treatmentId));

    // Delete the treatment itself
    await db.delete(treatments).where(eq(treatments.id, treatmentId));

    return NextResponse.json({ message: "Лечение успешно удалено" });
  } catch (error) {
    console.error(
      "DELETE /patients/[id]/treatments/[treatmentId] error:",
      error
    );
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
    const errorMessage =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json(
      { error: "Не удалось удалить лечение", details: errorMessage },
      { status: 500 }
    );
  }
};
