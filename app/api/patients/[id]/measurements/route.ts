import { db } from "@/db/drizzle";
import { measurements } from "@/db/schema";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { isMedicalProvider } from "@/lib/utils/auth";
import { verifyPatientAccess } from "@/lib/utils/patientVerification";
import { evaluateRisk } from "@/lib/thresholds";

type MetricCode =
  | "kpd"
  | "lpnp"
  | "ox"
  | "sak"
  | "rskf"
  | "ecg"
  | "smad"
  | "eye"
  | "bmi"
  | "smoking"
  | "glucose"
  | "foot"
  | "urine-microalbumin"
  | "urine-creatinine"
  | "sodium"
  | "potassium"
  | "probnp"
  | "ejection-fraction"
  | "echocardiography";

// Map metric codes back to measurement types
const METRIC_TO_MEASUREMENT_MAP: Record<MetricCode, string[]> = {
  kpd: ["creatinine"], // КПД - creatinine
  lpnp: ["ldl-cholesterol", "cholesterol"],
  ox: ["total-cholesterol", "triglycerides"],
  sak: ["hba1c"], // САК is HbA1c only
  glucose: ["glucose"], // Glucose is separate
  rskf: ["egfr"], // рСКФ - eGFR
  ecg: [], // ECG from external system
  smad: ["blood-pressure"],
  eye: ["eye-exam"],
  foot: ["foot-exam"],
  bmi: ["bmi", "weight", "height"], // BMI can be calculated from weight/height
  smoking: ["smoking"],
  "urine-microalbumin": ["urine-microalbumin"],
  "urine-creatinine": ["urine-creatinine"],
  sodium: ["sodium"],
  potassium: ["potassium"],
  probnp: ["probnp"],
  "ejection-fraction": ["ejection-fraction"],
  echocardiography: ["echocardiography"],
};

const measurementSchema = z.array(
  z.object({
    id: z.string().uuid(),
    type: z.string(),
    value1: z.string(),
    value2: z.string().nullable(),
    createdAt: z.string(),
  })
);

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    // Verify patient access
    await verifyPatientAccess(resolvedParams.id, session.user);

    // Check if filtering by metric code
    const url = new URL(request.url);
    const metricCode = url.searchParams.get("metricCode") as MetricCode | null;
    const condition = url.searchParams.get("condition") as
      | "АГ"
      | "СД"
      | "ХСН"
      | null;

    if (metricCode && METRIC_TO_MEASUREMENT_MAP[metricCode]) {
      // Fetch filtered measurements for specific metric
      const measurementTypes = METRIC_TO_MEASUREMENT_MAP[metricCode];

      if (measurementTypes.length === 0) {
        return NextResponse.json([]);
      }

      const data = await db
        .select({
          id: measurements.id,
          type: measurements.type,
          value1: measurements.value1,
          value2: measurements.value2,
          createdAt: measurements.createdAt,
        })
        .from(measurements)
        .where(eq(measurements.userId, resolvedParams.id))
        .orderBy(desc(measurements.createdAt))
        .limit(50);

      // Filter by measurement types
      const filteredData = data.filter((m) =>
        measurementTypes.includes(m.type)
      );

      // Add risk evaluation
      const result = filteredData.map((m) => {
        let riskValue: string | number = parseFloat(m.value1);

        // Special handling for blood pressure
        if (m.type === "blood-pressure" && metricCode === "smad") {
          riskValue = parseFloat(m.value1); // Use systolic for risk
        }

        // Special handling for boolean values
        if (["smoking", "foot-exam", "eye-exam"].includes(m.type)) {
          riskValue = m.value1; // Keep as string for boolean evaluation
        }

        const risk = evaluateRisk(
          riskValue,
          metricCode as MetricCode,
          condition || "АГ"
        );

        return {
          ...m,
          createdAt: m.createdAt?.toISOString() || new Date().toISOString(),
          risk,
        };
      });

      return NextResponse.json(result);
    }

    // Default: return all measurements
    const data = await db
      .select({
        id: measurements.id,
        type: measurements.type,
        value1: measurements.value1,
        value2: measurements.value2,
        createdAt: measurements.createdAt,
      })
      .from(measurements)
      .where(eq(measurements.userId, resolvedParams.id));

    const validated = measurementSchema.parse(
      data.map((item) => ({
        ...item,
        createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      }))
    );
    return NextResponse.json(validated);
  } catch (error) {
    console.error("GET /patients/[id]/measurements error:", error);

    if (error instanceof Error) {
      if (error.message === "Пациент не найден") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Доступ запрещен") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      {
        error: "Не удалось получить данные мониторинга",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
