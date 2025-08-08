import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import {
  users,
  invitations,
  pregnancies,
  fertileWomenRegister,
} from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";

const postSchema = z.object({
  patientId: z.string().uuid(),
  riskGroup: z.enum([
    "Скрининг",
    "Вакцинация",
    "Беременные",
    "ЖФВ",
    "ДН",
    "ПУЗ",
  ]),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const input = postSchema.parse(body);

    // Check if patient exists and is valid
    const patient = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, input.patientId),
          eq(users.userType, "PATIENT"),
          ilike(users.organization, session.user.organization),
          ilike(users.city, session.user.city)
        )
      )
      .limit(1);

    if (!patient.length) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    // Check if invitation exists
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.patientId, input.patientId),
          eq(invitations.riskGroup, input.riskGroup),
          eq(invitations.status, "INVITED")
        )
      )
      .limit(1);

    if (existingInvitation.length) {
      return NextResponse.json(
        { error: "Пациент уже приглашен для этой группы" },
        { status: 400 }
      );
    }

    // Create base invitation
    await db.insert(invitations).values({
      patientId: input.patientId,
      providerId: session.user.id,
      riskGroup: input.riskGroup,
      status: "INVITED",
    });

    if (input.riskGroup === "Беременные") {
      // Check if already has active pregnancy
      const existingPregnancy = await db
        .select()
        .from(pregnancies)
        .where(
          and(
            eq(pregnancies.userId, input.patientId),
            eq(pregnancies.status, "active")
          )
        )
        .limit(1);

      if (!existingPregnancy.length) {
        // Create pregnancy record with today as LMP
        const today = new Date();
        await db.insert(pregnancies).values({
          userId: input.patientId,
          lmp: today.toISOString().split("T")[0], // Format as YYYY-MM-DD
          status: "active",
        });
      }
    } else if (input.riskGroup === "ЖФВ") {
      // Check if already registered
      const existingRegister = await db
        .select()
        .from(fertileWomenRegister)
        .where(and(eq(fertileWomenRegister.userId, input.patientId)))
        .limit(1);

      if (!existingRegister.length) {
        const today = new Date();
        // Create fertile women register record
        await db.insert(fertileWomenRegister).values({
          userId: input.patientId,
          registrationDate: today.toISOString().split("T")[0], // Format as YYYY-MM-DD
          pregnanciesCount: 0,
          birthsCount: 0,
          abortionsCount: 0,
          stillbirthsCount: 0,
        });
      }
    }

    return NextResponse.json(
      { message: "Приглашение отправлено" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Ошибка при создании приглашения:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Не удалось создать приглашение" },
      { status: 500 }
    );
  }
}
