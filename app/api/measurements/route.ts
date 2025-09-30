import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { measurements, criticalValues, patientAlerts } from "@/db/schema";
import { auth } from "@/auth";
import { eq, desc, and } from "drizzle-orm";

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
  | "height"
  | "ultrasound"
  | "xray"
  | "inr";

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

// Helper function to check critical values and manage alerts
async function checkAndUpdateAlerts(
  patientId: string,
  measurementId: string,
  measurementType: string,
  value1: string,
  value2?: string
) {
  try {
    // First, delete all existing alerts for this patient and measurement type
    // We need to find measurements of this type for this patient and delete their alerts
    const existingMeasurements = await db
      .select({ id: measurements.id })
      .from(measurements)
      .where(
        and(
          eq(measurements.userId, patientId),
          eq(measurements.type, measurementType as MeasurementType)
        )
      );

    if (existingMeasurements.length > 0) {
      const measurementIds = existingMeasurements.map((m) => m.id);
      for (const id of measurementIds) {
        await db
          .delete(patientAlerts)
          .where(eq(patientAlerts.measurementId, id));
      }
    }

    // Get critical values for this patient and measurement type
    const criticalValueData = await db
      .select()
      .from(criticalValues)
      .where(
        and(
          eq(criticalValues.patientId, patientId),
          eq(criticalValues.measurementType, measurementType as MeasurementType)
        )
      );

    if (criticalValueData.length === 0) {
      return; // No critical values set
    }

    const critical = criticalValueData[0];
    let alertStatus = "NORMAL";
    let message = "";

    const val1 = parseFloat(value1);
    const val2 = value2 ? parseFloat(value2) : null;

    // Check critical thresholds
    if (measurementType === "blood-pressure" && val2) {
      // For blood pressure, check both systolic and diastolic
      const systolicHigh = critical.maxValue
        ? parseFloat(critical.maxValue.toString())
        : null;
      const systolicLow = critical.minValue
        ? parseFloat(critical.minValue.toString())
        : null;
      const diastolicHigh = critical.maxValue2
        ? parseFloat(critical.maxValue2.toString())
        : null;
      const diastolicLow = critical.minValue2
        ? parseFloat(critical.minValue2.toString())
        : null;

      if (
        (systolicHigh && val1 > systolicHigh) ||
        (diastolicHigh && val2 > diastolicHigh) ||
        (systolicLow && val1 < systolicLow) ||
        (diastolicLow && val2 < diastolicLow)
      ) {
        alertStatus = "CRITICAL";
        message = `Артериальное давление ${val1}/${val2} вне нормальных значений`;
      }
    } else {
      // For single value measurements
      const maxVal = critical.maxValue
        ? parseFloat(critical.maxValue.toString())
        : null;
      const minVal = critical.minValue
        ? parseFloat(critical.minValue.toString())
        : null;

      if ((maxVal && val1 > maxVal) || (minVal && val1 < minVal)) {
        alertStatus = "CRITICAL";
        const russianMeasurementType =
          getMeasurementTypeInRussian(measurementType);
        message = `${russianMeasurementType}: ${val1}, вне нормальных значений`;
      }
    }

    // Create alert only if critical
    if (alertStatus === "CRITICAL") {
      await db.insert(patientAlerts).values({
        patientId,
        measurementId,
        alertStatus,
        criticalValueId: critical.id,
        message,
      });
    }
  } catch (error) {
    console.error("Error checking critical values:", error);
  }
}

// Helper function to check if user can enter measurements for a patient
async function canUserEnterMeasurement(
  currentUserId: string,
  currentUserType: string,
  targetPatientId: string
): Promise<boolean> {
  // Medical staff can enter measurements for any patient
  const medicalStaffTypes = [
    "NURSE",
    "DISTRICT_DOCTOR",
    "SPECIALIST_DOCTOR",
    "DOCTOR",
    "REGIONAL_ADMIN",
    "CITY_ADMIN",
    "DISTRICT_ADMIN",
  ];

  if (medicalStaffTypes.includes(currentUserType)) {
    return true;
  }

  // Patients can only enter their own measurements
  if (currentUserType === "PATIENT") {
    return currentUserId === targetPatientId;
  }

  return false;
}

export const POST = async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, value1, value2, patientId } = await req.json();

  // Determine the target patient ID
  const targetPatientId = patientId || session.user.id;

  // Check permissions
  const hasPermission = await canUserEnterMeasurement(
    session.user.id,
    session.user.userType || "PATIENT",
    targetPatientId
  );

  if (!hasPermission) {
    return NextResponse.json(
      {
        error:
          "Insufficient permissions to enter measurements for this patient",
      },
      { status: 403 }
    );
  }

  try {
    // Insert the measurement for the target patient
    const newMeasurement = await db
      .insert(measurements)
      .values({
        userId: targetPatientId,
        type,
        value1,
        value2: value2 || null,
      })
      .returning();

    // Check for critical values and update alerts
    const measurementId = newMeasurement[0].id;
    await checkAndUpdateAlerts(
      targetPatientId,
      measurementId,
      type,
      value1,
      value2
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error saving measurement:", error);
    return NextResponse.json(
      { error: "Failed to save measurement" },
      { status: 500 }
    );
  }
};

export const GET = async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const targetPatientId = patientId || session.user.id;

  // Check permissions to view measurements
  const hasPermission = await canUserEnterMeasurement(
    session.user.id,
    session.user.userType || "PATIENT",
    targetPatientId
  );

  if (!hasPermission) {
    return NextResponse.json(
      {
        error: "Insufficient permissions to view measurements for this patient",
      },
      { status: 403 }
    );
  }

  try {
    const latestMeasurements = await db
      .select({
        id: measurements.id,
        type: measurements.type,
        value1: measurements.value1,
        value2: measurements.value2,
        createdAt: measurements.createdAt,
      })
      .from(measurements)
      .where(eq(measurements.userId, targetPatientId))
      .orderBy(desc(measurements.createdAt));
    return NextResponse.json(latestMeasurements, { status: 200 });
  } catch (error) {
    console.error("Error fetching measurements:", error);
    return NextResponse.json(
      { error: "Failed to fetch measurements" },
      { status: 500 }
    );
  }
};
