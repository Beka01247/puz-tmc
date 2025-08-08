import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/drizzle";
import { users, diagnoses, patientAlerts, measurements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { calculateAgeFromIIN } from "@/lib/utils/ageCalculator";

// Helper function to translate measurement types to Russian
function getMeasurementTypeInRussian(measurementType: string): string {
  const translations: Record<string, string> = {
    "blood-pressure": "Артериальное давление",
    pulse: "Пульс",
    temperature: "Температура",
    glucose: "Глюкоза",
    oximeter: "Оксигинация крови",
    spirometer: "Спирография",
    cholesterol: "Холестерин",
    hemoglobin: "Гемоглобин",
    triglycerides: "Триглицериды",
    weight: "Вес",
    height: "Рост",
    ultrasound: "УЗИ мобил",
    xray: "Рентген мобил",
    inr: "МНО",
  };

  return translations[measurementType] || measurementType;
}

const calculateAge = (iin: string): number => {
  return calculateAgeFromIIN(iin);
};

export interface DashboardPatient {
  id: string;
  name: string;
  age: number;
  diagnosis: string | null;
  alertStatus: "NORMAL" | "CRITICAL";
  activeAlerts: number;
  alertMeasurements: string[];
}

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.userType === "PATIENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // First, get all patients
    const patientRecords = await db
      .select({
        id: users.id,
        name: users.fullName,
        iin: users.iin,
        diagnoses: sql`string_agg(DISTINCT ${diagnoses.description}, ', ')`.as(
          "diagnoses"
        ),
      })
      .from(users)
      .leftJoin(diagnoses, eq(diagnoses.userId, users.id))
      .where(
        and(
          eq(users.userType, "PATIENT"),
          eq(users.organization, session.user.organization),
          eq(users.city, session.user.city)
        )
      )
      .groupBy(users.id, users.fullName, users.iin);

    // Then, get alert information for each patient
    const patientsWithAlerts: DashboardPatient[] = await Promise.all(
      patientRecords.map(async (record) => {
        const alertsData = await db
          .select({
            measurementType: measurements.type,
            alertStatus: patientAlerts.alertStatus,
          })
          .from(patientAlerts)
          .leftJoin(
            measurements,
            eq(measurements.id, patientAlerts.measurementId)
          )
          .where(
            and(
              eq(patientAlerts.patientId, record.id),
              eq(patientAlerts.alertStatus, "CRITICAL")
            )
          );

        const criticalAlerts = alertsData.length;
        const uniqueMeasurementTypes = [
          ...new Set(
            alertsData.map((alert) => alert.measurementType).filter(Boolean)
          ),
        ];

        const alertMeasurements = uniqueMeasurementTypes.map((type) =>
          getMeasurementTypeInRussian(type as string)
        );

        return {
          id: record.id,
          name: record.name,
          age: calculateAge(record.iin),
          diagnosis: (record.diagnoses as string) || "Нет диагнозов",
          alertStatus:
            criticalAlerts > 0 ? ("CRITICAL" as const) : ("NORMAL" as const),
          activeAlerts: criticalAlerts,
          alertMeasurements,
        };
      })
    );

    // Sort critical patients first
    const sortedPatients = patientsWithAlerts.sort((a, b) => {
      if (a.alertStatus === "CRITICAL" && b.alertStatus === "NORMAL") return -1;
      if (a.alertStatus === "NORMAL" && b.alertStatus === "CRITICAL") return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(sortedPatients);
  } catch (error) {
    console.error("Error fetching dashboard patients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
