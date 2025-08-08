import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users, diagnoses, riskGroups, invitations } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod";
import { calculateAgeFromIIN } from "@/lib/utils/ageCalculator";
import { isMedicalProvider } from "@/lib/utils/auth";

const querySchema = z.object({
  riskGroup: z
    .enum(["Скрининг", "Вакцинация", "Беременные", "ЖФВ", "ДН", "ПУЗ"])
    .default("Скрининг")
    .transform((val) => decodeURIComponent(val)),
  age: z.coerce.number().min(0).max(120).optional(),
  noRiskGroupFilter: z.preprocess(
    (val) => val === "true",
    z.boolean().default(false)
  ),
});

function calculateAge(iin: string): number | null {
  return calculateAgeFromIIN(iin) || null;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isMedicalProvider(session.user.userType)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      riskGroup: searchParams.get("riskGroup") || "Скрининг",
      age: searchParams.get("age"),
      noRiskGroupFilter: searchParams.get("noRiskGroupFilter") ?? undefined,
    });

    // Age filtering for Скрининг
    const ageConditions = [];
    if (
      query.riskGroup === "Скрининг" &&
      query.age !== undefined &&
      query.age > 0
    ) {
      const currentYear = new Date().getFullYear();
      const targetYearMin = currentYear - query.age - 1;
      const targetYearMax = currentYear - query.age;
      ageConditions.push(
        sql`
          CASE
            WHEN to_date(left(${users.iin}, 6), 'YYMMDD') IS NOT NULL
            THEN EXTRACT(YEAR FROM to_date(left(${users.iin}, 6), 'YYMMDD')) BETWEEN ${targetYearMin} AND ${targetYearMax}
            ELSE FALSE
          END
        `
      );
    }

    // Base query
    const selectObj = {
      id: users.id,
      name: users.fullName,
      iin: users.iin,
      diagnoses: sql`STRING_AGG(DISTINCT ${diagnoses.description}, ', ')`,
    };

    // Only add invitation status for non-ЖФВ groups
    if (query.riskGroup !== "ЖФВ") {
      Object.assign(selectObj, {
        hasInvitation: sql`BOOL_OR(${invitations.id} IS NOT NULL)`, // Check if any invitation exists
      });
    }

    let baseQuery = db
      .select(selectObj)
      .from(users)
      .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
      .where(
        and(
          eq(users.userType, "PATIENT"),
          ilike(users.organization, session.user.organization),
          ilike(users.city, session.user.city),
          ...ageConditions
        )
      );

    // Add invitation status join only for non-ЖФВ groups

    baseQuery = baseQuery.leftJoin(
      invitations,
      and(
        eq(invitations.patientId, users.id),
        eq(invitations.riskGroup, query.riskGroup),
        eq(invitations.status, "INVITED")
      )
    );

    // Apply risk group filter for all groups except Скрининг
    if (query.riskGroup !== "Скрининг") {
      baseQuery = baseQuery.innerJoin(
        riskGroups,
        and(
          eq(riskGroups.userId, users.id),
          eq(riskGroups.name, query.riskGroup)
        )
      );
    }

    // Group by the necessary fields
    const patientRecords = await baseQuery.groupBy(
      users.id,
      users.fullName,
      users.iin
    );

    const patients = patientRecords
      .map((record) => {
        const age = calculateAge(record.iin);
        if (
          age === null &&
          query.riskGroup === "Скрининг" &&
          query.age !== undefined &&
          query.age > 0
        ) {
          return null;
        }
        return {
          id: record.id,
          name: record.name,
          age: age ?? 0,
          diagnosis: record.diagnoses || "Нет диагнозов",
          // For ЖФВ, we don't need invitation status
          isInvited: query.riskGroup === "ЖФВ" ? undefined : record,
        };
      })
      .filter(
        (patient): patient is NonNullable<typeof patient> => patient !== null
      );

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid request parameters"
            : "Server error",
      },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}
