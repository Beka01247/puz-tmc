import { db } from "@/db/drizzle";
import {
  users,
  diagnoses,
  riskGroups,
  invitations,
  fertileWomenRegister,
  patientScreenings,
  screenings,
  patientVaccinations,
  pregnancies,
} from "@/db/schema";
import { and, eq, sql, SQL, ilike, isNull } from "drizzle-orm";
import { calculateAgeFromIIN } from "@/lib/utils/ageCalculator";

export interface ExaminationFilters {
  organization: string;
  city: string;
  riskGroup: string;
  age?: number;
}

function calculateAge(iin: string): number {
  return calculateAgeFromIIN(iin);
}

function buildAgeFilter(age: number): SQL {
  const currentYear = new Date().getFullYear();
  const targetYearMin = currentYear - age - 1;
  const targetYearMax = currentYear - age;

  return sql`
    CASE
      WHEN to_date(left(${users.iin}, 6), 'YYMMDD') IS NOT NULL
      THEN EXTRACT(YEAR FROM to_date(left(${users.iin}, 6), 'YYMMDD')) BETWEEN ${targetYearMin} AND ${targetYearMax}
      ELSE FALSE
    END
  `;
}

function buildScreeningsQuery(filters: ExaminationFilters) {
  const { organization, city, riskGroup, age } = filters;

  const ageFilters: SQL[] = [];
  if (riskGroup === "Скрининг" && age !== undefined && age > 0) {
    ageFilters.push(buildAgeFilter(age));
  }

  const ps = patientScreenings;
  const s = screenings;
  const pv = patientVaccinations;
  const pg = pregnancies;
  const rg = riskGroups;
  const inv = invitations;

  // Build the base query with common selections
  const baseSelect = {
    id: users.id,
    name: users.fullName,
    iin: users.iin,
    diagnoses: sql`STRING_AGG(DISTINCT ${diagnoses.description}, ', ')`,
    completedScreenings:
      riskGroup === "Скрининг"
        ? sql`STRING_AGG(DISTINCT CASE WHEN ${ps.status} = 'CONFIRMED' THEN COALESCE(${s.name}, ${ps.customScreeningName}) END, ', ')`
        : sql`NULL`,
    completedVaccinations:
      riskGroup === "Вакцинация"
        ? sql`STRING_AGG(DISTINCT CASE WHEN ${pv.status} = 'CONFIRMED' THEN ${pv.name} END, ', ')`
        : sql`NULL`,
    pregnancyLmp: riskGroup === "Беременные" ? pg.lmp : sql`NULL`,
    invitationId: ["ДН", "ПУЗ", "Беременные", "ЖФВ"].includes(riskGroup)
      ? inv.id
      : sql`NULL`,
  };

  // Build query based on risk group to maintain proper types
  switch (riskGroup) {
    case "Скрининг":
      return db
        .select(baseSelect)
        .from(users)
        .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
        .leftJoin(ps, eq(ps.patientId, users.id))
        .leftJoin(s, eq(s.id, ps.screeningId))
        .where(
          and(
            eq(users.userType, "PATIENT"),
            ilike(users.organization, organization || ""),
            ilike(users.city, city || ""),
            ...ageFilters
          )
        );

    case "Вакцинация":
      return db
        .select(baseSelect)
        .from(users)
        .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
        .leftJoin(pv, eq(pv.patientId, users.id))
        .where(
          and(
            eq(users.userType, "PATIENT"),
            ilike(users.organization, organization || ""),
            ilike(users.city, city || ""),
            ...ageFilters
          )
        );

    case "Беременные":
      return db
        .select(baseSelect)
        .from(users)
        .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
        .innerJoin(pg, and(eq(pg.userId, users.id), eq(pg.status, "active")))
        .leftJoin(
          inv,
          and(
            eq(inv.patientId, users.id),
            eq(inv.riskGroup, riskGroup),
            eq(inv.status, "INVITED")
          )
        )
        .where(
          and(
            eq(users.userType, "PATIENT"),
            ilike(users.organization, organization || ""),
            ilike(users.city, city || ""),
            ...ageFilters
          )
        );

    case "ЖФВ":
      return db
        .select(baseSelect)
        .from(users)
        .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
        .innerJoin(
          fertileWomenRegister,
          and(
            eq(fertileWomenRegister.userId, users.id),
            isNull(fertileWomenRegister.deregistrationDate)
          )
        )
        .leftJoin(
          inv,
          and(
            eq(inv.patientId, users.id),
            eq(inv.riskGroup, riskGroup),
            eq(inv.status, "INVITED")
          )
        )
        .where(
          and(
            eq(users.userType, "PATIENT"),
            ilike(users.organization, organization || ""),
            ilike(users.city, city || ""),
            ...ageFilters
          )
        );

    case "ДН":
    case "ПУЗ":
      return db
        .select(baseSelect)
        .from(users)
        .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
        .innerJoin(rg, and(eq(rg.userId, users.id), eq(rg.name, riskGroup)))
        .leftJoin(
          inv,
          and(
            eq(inv.patientId, users.id),
            eq(inv.riskGroup, riskGroup),
            eq(inv.status, "INVITED")
          )
        )
        .where(
          and(
            eq(users.userType, "PATIENT"),
            ilike(users.organization, organization || ""),
            ilike(users.city, city || ""),
            ...ageFilters
          )
        );

    default:
      // Default case for any other risk groups
      return db
        .select(baseSelect)
        .from(users)
        .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
        .where(
          and(
            eq(users.userType, "PATIENT"),
            ilike(users.organization, organization || ""),
            ilike(users.city, city || ""),
            ...ageFilters
          )
        );
  }
}

export async function getPatients(filters: ExaminationFilters) {
  try {
    const query = buildScreeningsQuery(filters);

    // Different columns need to be grouped based on the tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupByColumns: any[] = [users.id, users.fullName, users.iin];

    if (filters.riskGroup === "Беременные") {
      groupByColumns.push(pregnancies.lmp, invitations.id);
    } else if (["ДН", "ПУЗ", "ЖФВ"].includes(filters.riskGroup)) {
      groupByColumns.push(invitations.id);
    }

    const patients = await query.groupBy(...groupByColumns);

    return patients.map((patient) => ({
      id: patient.id,
      name: patient.name,
      age: calculateAge(patient.iin),
      diagnosis: (patient.diagnoses as string) || "Нет диагнозов",
      isInvited: ["ДН", "ПУЗ", "ЖФВ", "Беременные"].includes(filters.riskGroup)
        ? !!patient.invitationId
        : undefined,
      completedScreenings:
        filters.riskGroup === "Скрининг"
          ? (patient.completedScreenings as string) ||
            "Нет пройденных скринингов"
          : undefined,
      completedVaccinations:
        filters.riskGroup === "Вакцинация"
          ? (patient.completedVaccinations as string) ||
            "Нет пройденных вакцинаций"
          : undefined,
      pregnancyWeek:
        filters.riskGroup === "Беременные" && patient.pregnancyLmp
          ? calculatePregnancyWeek(new Date(patient.pregnancyLmp as string))
          : undefined,
    }));
  } catch (error) {
    console.error("Error in examinations service:", error);
    throw error;
  }
}

function calculatePregnancyWeek(lmp: Date): number {
  const now = new Date();
  const differenceInMilliseconds = now.getTime() - lmp.getTime();
  const differenceInWeeks = Math.floor(
    differenceInMilliseconds / (1000 * 60 * 60 * 24 * 7)
  );
  return differenceInWeeks;
}
