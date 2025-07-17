import { db } from "@/db/drizzle";
import { recommendations } from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const recommendationSchema = z.object({
  description: z.string().min(1, "Требуется описание рекомендации"),
});

const updateRecommendationSchema = recommendationSchema.partial().extend({
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
        id: recommendations.id,
        patientId: recommendations.patientId,
        providerId: recommendations.providerId,
        description: recommendations.description,
        createdAt: recommendations.createdAt,
        updatedAt: recommendations.updatedAt,
      })
      .from(recommendations)
      .where(eq(recommendations.patientId, session.user.id));
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /recommendations error:", error);
    return NextResponse.json(
      { error: "Не удалось получить рекомендации", details: error },
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
    const validated = recommendationSchema.parse(body);

    const [newRecommendation] = await db
      .insert(recommendations)
      .values({
        patientId: session.user.id,
        providerId: session.user.id,
        description: validated.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return NextResponse.json(newRecommendation);
  } catch (error) {
    console.error("POST /recommendations error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось создать рекомендацию", details: error },
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
    const validated = updateRecommendationSchema.parse(body);

    const [updatedRecommendation] = await db
      .update(recommendations)
      .set({
        description: validated.description,
        updatedAt: new Date(),
      })
      .where(eq(recommendations.id, validated.id))
      .returning();
    if (!updatedRecommendation) {
      return NextResponse.json(
        { error: "Рекомендация не найдена" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedRecommendation);
  } catch (error) {
    console.error("PUT /recommendations error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверные данные", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Не удалось обновить рекомендацию", details: error },
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

    const [deletedRecommendation] = await db
      .delete(recommendations)
      .where(eq(recommendations.id, id))
      .returning();
    if (!deletedRecommendation) {
      return NextResponse.json(
        { error: "Рекомендация не найдена" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Рекомендация удалена" });
  } catch (error) {
    console.error("DELETE /recommendations error:", error);
    return NextResponse.json(
      { error: "Не удалось удалить рекомендацию", details: error },
      { status: 500 }
    );
  }
}
