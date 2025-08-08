import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import {
  measurements,
  users,
  riskGroups,
  pregnancies,
  fertileWomenRegister,
} from "@/db/schema";
import { sql, and, gte, lt, eq, SQL } from "drizzle-orm";

type MeasurementType =
  | "blood-pressure"
  | "pulse"
  | "temperature"
  | "glucose"
  | "oximeter"
  | "spirometer"
  | "cholesterol"
  | "hemoglobin"
  | "triglycerides"
  | "weight"
  | "height";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const measurementType = searchParams.get("measurementType");
    const group = searchParams.get("group");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const organization = searchParams.get("organization");
    const city = searchParams.get("city");

    if (!measurementType || !group) {
      return NextResponse.json(
        { error: "measurementType and group are required" },
        { status: 400 }
      );
    }

    // Build date filter conditions
    const dateConditions: SQL<unknown>[] = [];
    if (dateFrom) {
      const fromDate = new Date(dateFrom + "T00:00:00.000Z");
      dateConditions.push(gte(measurements.createdAt, fromDate));
    }
    if (dateTo) {
      const toDate = new Date(dateTo + "T23:59:59.999Z");
      dateConditions.push(lt(measurements.createdAt, toDate));
    }

    const whereConditions = [
      eq(measurements.type, measurementType as MeasurementType),
      ...dateConditions,
    ];

    // Add organization and city filters if provided
    if (organization) {
      whereConditions.push(eq(users.organization, organization));
    }
    if (city) {
      whereConditions.push(eq(users.city, city));
    }

    // First, get all users who have measurements matching the criteria
    const baseQuery = db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        telephone: users.telephone,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        city: users.city,
        organization: users.organization,
      })
      .from(measurements)
      .innerJoin(users, eq(measurements.userId, users.id))
      .where(and(...whereConditions))
      .groupBy(
        users.id,
        users.fullName,
        users.email,
        users.telephone,
        users.dateOfBirth,
        users.gender,
        users.city,
        users.organization
      );

    let usersData: {
      id: string;
      fullName: string | null;
      email: string;
      telephone: string | null;
      dateOfBirth: string | null;
      gender: string | null;
      city: string;
      organization: string;
    }[];

    if (group === "Все") {
      // For "Все" group, get all users
      usersData = await baseQuery.orderBy(users.fullName);
    } else {
      // For specific groups, we need to filter by group membership
      const allUsers = await baseQuery.orderBy(users.fullName);
      const userIds = allUsers.map((u) => u.id);

      if (userIds.length === 0) {
        usersData = [];
      } else {
        // Get group memberships
        const pregnantUsers = await db
          .select({ userId: pregnancies.userId })
          .from(pregnancies)
          .where(
            sql`${pregnancies.userId} IN (${sql.join(
              userIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          );

        const fertileWomenUsers = await db
          .select({ userId: fertileWomenRegister.userId })
          .from(fertileWomenRegister)
          .where(
            sql`${fertileWomenRegister.userId} IN (${sql.join(
              userIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          );

        const riskGroupUsers = await db
          .select({
            userId: riskGroups.userId,
            groupName: riskGroups.name,
          })
          .from(riskGroups)
          .where(
            sql`${riskGroups.userId} IN (${sql.join(
              userIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          );

        // Create maps for quick lookup
        const pregnantSet = new Set(pregnantUsers.map((p) => p.userId));
        const fertileWomenSet = new Set(fertileWomenUsers.map((f) => f.userId));
        const riskGroupMap = new Map();

        riskGroupUsers.forEach((rg) => {
          if (!riskGroupMap.has(rg.userId)) {
            riskGroupMap.set(rg.userId, []);
          }
          riskGroupMap.get(rg.userId).push(rg.groupName);
        });

        // Filter users by the requested group (users can belong to multiple groups)
        usersData = allUsers.filter((user) => {
          if (group === "Беременные") {
            return pregnantSet.has(user.id);
          } else if (group === "ЖВФ") {
            return fertileWomenSet.has(user.id);
          } else if (group === "ПУЗ") {
            return (
              riskGroupMap.has(user.id) &&
              riskGroupMap.get(user.id).includes("ПУЗ")
            );
          } else if (group === "ДН") {
            return (
              riskGroupMap.has(user.id) &&
              riskGroupMap.get(user.id).includes("ДН")
            );
          }

          // For any other group or "Другие", check if user doesn't belong to any specific group
          if (group === "Другие") {
            return (
              !pregnantSet.has(user.id) &&
              !fertileWomenSet.has(user.id) &&
              !riskGroupMap.has(user.id)
            );
          }

          return false;
        });
      }
    }

    return NextResponse.json({ users: usersData });
  } catch (error) {
    console.error("Error fetching users data:", error);
    return NextResponse.json(
      { error: "Failed to fetch users data" },
      { status: 500 }
    );
  }
}
