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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const organization = searchParams.get("organization");
    const city = searchParams.get("city");

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

    // Add organization and city filters
    const orgCityConditions: SQL<unknown>[] = [];
    if (organization) {
      orgCityConditions.push(eq(users.organization, organization));
    }
    if (city) {
      orgCityConditions.push(eq(users.city, city));
    }

    // Function to get statistics for a specific measurement type
    const getStatisticsForMeasurementType = async (
      measurementType: MeasurementType
    ) => {
      // First, get all users who have measurements of this type
      const usersWithMeasurements = await db
        .select({
          userId: users.id,
          userName: users.fullName,
        })
        .from(measurements)
        .innerJoin(users, eq(measurements.userId, users.id))
        .where(
          and(
            eq(measurements.type, measurementType),
            ...dateConditions,
            ...orgCityConditions
          )
        )
        .groupBy(users.id, users.fullName);

      const userIds = usersWithMeasurements.map((u) => u.userId);

      if (userIds.length === 0) {
        return {
          byGroup: [],
          totalUsers: [{ count: 0 }],
        };
      }

      // Get group memberships for these users
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

      // Classify users by ALL applicable groups (not priority-based)
      const groupCounts = {
        Беременные: 0,
        ЖВФ: 0,
        ПУЗ: 0,
        ДН: 0,
        Другие: 0,
      };

      userIds.forEach((userId) => {
        let belongsToAnyGroup = false;

        // Check if user is pregnant
        if (pregnantSet.has(userId)) {
          groupCounts["Беременные"]++;
          belongsToAnyGroup = true;
        }

        // Check if user is in fertile women register
        if (fertileWomenSet.has(userId)) {
          groupCounts["ЖВФ"]++;
          belongsToAnyGroup = true;
        }

        // Check if user is in risk groups
        if (riskGroupMap.has(userId)) {
          const userGroups = riskGroupMap.get(userId);
          if (userGroups.includes("ПУЗ")) {
            groupCounts["ПУЗ"]++;
            belongsToAnyGroup = true;
          }
          if (userGroups.includes("ДН")) {
            groupCounts["ДН"]++;
            belongsToAnyGroup = true;
          }
        }

        // If user doesn't belong to any specific group, count as "Другие"
        if (!belongsToAnyGroup) {
          groupCounts["Другие"]++;
        }
      });

      // Convert to the expected format
      const byGroup = Object.entries(groupCounts)
        .filter(([, count]) => count > 0)
        .map(([groupName, userCount]) => ({ groupName, userCount }));

      const totalUsers = [{ count: userIds.length }];

      return { byGroup, totalUsers };
    };

    // Get statistics for all measurement types
    const measurementTypes: MeasurementType[] = [
      "blood-pressure",
      "pulse",
      "temperature",
      "glucose",
      "oximeter",
      "spirometer",
      "cholesterol",
      "hemoglobin",
      "triglycerides",
      "weight",
      "height",
    ];

    const allStatistics = await Promise.all(
      measurementTypes.map(async (type) => {
        const stats = await getStatisticsForMeasurementType(type);
        return { type, ...stats };
      })
    );

    // Initialize result structure
    const groups = ["ПУЗ", "ДН", "Беременные", "ЖВФ", "Все"];
    const statistics = {
      bloodPressure: {} as Record<string, number>,
      pulse: {} as Record<string, number>,
      temperature: {} as Record<string, number>,
      glucose: {} as Record<string, number>,
      oximeter: {} as Record<string, number>,
      spirometer: {} as Record<string, number>,
      cholesterol: {} as Record<string, number>,
      hemoglobin: {} as Record<string, number>,
      triglycerides: {} as Record<string, number>,
      weight: {} as Record<string, number>,
      height: {} as Record<string, number>,
    };

    // Initialize all groups with 0
    groups.forEach((group) => {
      statistics.bloodPressure[group] = 0;
      statistics.pulse[group] = 0;
      statistics.temperature[group] = 0;
      statistics.glucose[group] = 0;
      statistics.oximeter[group] = 0;
      statistics.spirometer[group] = 0;
      statistics.cholesterol[group] = 0;
      statistics.hemoglobin[group] = 0;
      statistics.triglycerides[group] = 0;
      statistics.weight[group] = 0;
      statistics.height[group] = 0;
    });

    // Process statistics for each measurement type
    allStatistics.forEach(({ type, byGroup, totalUsers }) => {
      const measurementKey = type === "blood-pressure" ? "bloodPressure" : type;

      // Fill in data by group
      byGroup.forEach((stat) => {
        if (stat.groupName !== "Другие") {
          statistics[measurementKey as keyof typeof statistics][
            stat.groupName
          ] = stat.userCount;
        }
      });

      // Set total users (including all groups and ungrouped users)
      statistics[measurementKey as keyof typeof statistics]["Все"] =
        totalUsers[0]?.count || 0;
    });

    return NextResponse.json({ statistics });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
