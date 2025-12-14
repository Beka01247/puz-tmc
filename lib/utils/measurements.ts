// Measurement utilities for ПУЗ Registry

import { db } from "@/db/drizzle";
import { measurements, users, riskGroups } from "@/db/schema";
import { eq, desc, and, SQL } from "drizzle-orm";
import { RegistryRow, RiskLevel, PuzCondition } from "@/types/puz";
import {
  evaluateRisk,
  calculateOverallRisk,
  getScreeningInterval,
} from "@/lib/thresholds";
import { computeBMI } from "@/lib/utils/puzFormatters";

/**
 * Get the latest measurements for a patient
 */
export async function getLatestMeasurements(
  patientId: string
): Promise<RegistryRow["lastMeasurements"]> {
  try {
    // Fetch all measurements for the patient, ordered by most recent
    const allMeasurements = await db
      .select()
      .from(measurements)
      .where(eq(measurements.userId, patientId))
      .orderBy(desc(measurements.createdAt))
      .limit(100); // Get last 100 measurements to ensure we have latest of each type

    const result: RegistryRow["lastMeasurements"] = {};

    // Track latest measurement of each type
    const latestByType: Record<string, (typeof allMeasurements)[0]> = {};

    for (const m of allMeasurements) {
      if (!latestByType[m.type]) {
        latestByType[m.type] = m;
      }
    }

    // Map blood-pressure to SMAD
    if (latestByType["blood-pressure"]) {
      const bp = latestByType["blood-pressure"];
      result.smad = {
        systolic: parseFloat(bp.value1) || undefined,
        diastolic: parseFloat(bp.value2 || "0") || undefined,
        date: bp.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map LDL cholesterol to LPNP (prioritize ldl-cholesterol over cholesterol)
    if (latestByType["ldl-cholesterol"]) {
      const ldl = latestByType["ldl-cholesterol"];
      result.lpnp = {
        value: parseFloat(ldl.value1) || ldl.value1,
        date: ldl.createdAt?.toISOString() || new Date().toISOString(),
      };
    } else if (latestByType["cholesterol"]) {
      const chol = latestByType["cholesterol"];
      result.lpnp = {
        value: parseFloat(chol.value1) || chol.value1,
        date: chol.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map total cholesterol to O.X. (prioritize total-cholesterol over triglycerides)
    if (latestByType["total-cholesterol"]) {
      const total = latestByType["total-cholesterol"];
      result.ox = {
        value: parseFloat(total.value1) || total.value1,
        date: total.createdAt?.toISOString() || new Date().toISOString(),
      };
    } else if (latestByType["triglycerides"]) {
      const trig = latestByType["triglycerides"];
      result.ox = {
        value: parseFloat(trig.value1) || trig.value1,
        date: trig.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map HbA1c to SAK
    if (latestByType["hba1c"]) {
      const hba1c = latestByType["hba1c"];
      result.sak = {
        value: parseFloat(hba1c.value1) || hba1c.value1,
        date: hba1c.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map glucose separately (for СД patients)
    if (latestByType["glucose"]) {
      const gluc = latestByType["glucose"];
      result.glucose = {
        value: parseFloat(gluc.value1) || gluc.value1,
        date: gluc.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map eGFR to рСКФ
    if (latestByType["egfr"]) {
      const egfr = latestByType["egfr"];
      result.rskf = {
        value: parseFloat(egfr.value1) || egfr.value1,
        date: egfr.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Check for direct BMI measurement first, otherwise calculate from weight and height
    if (latestByType["bmi"]) {
      const bmiMeasurement = latestByType["bmi"];
      const weight = latestByType["weight"]
        ? parseFloat(latestByType["weight"].value1)
        : undefined;
      const heightCm = latestByType["height"]
        ? parseFloat(latestByType["height"].value1)
        : undefined;
      const heightM = heightCm ? heightCm / 100 : undefined;

      result.bmi = {
        value: parseFloat(bmiMeasurement.value1),
        weight,
        height: heightM,
        date:
          bmiMeasurement.createdAt?.toISOString() || new Date().toISOString(),
      };
    } else if (latestByType["weight"] && latestByType["height"]) {
      const weight = parseFloat(latestByType["weight"].value1);
      const heightCm = parseFloat(latestByType["height"].value1);
      const heightM = heightCm / 100; // Convert cm to m

      if (weight > 0 && heightM > 0) {
        const bmiValue = computeBMI(weight, heightM);
        result.bmi = {
          value: bmiValue,
          weight,
          height: heightM,
          date:
            latestByType["weight"].createdAt?.toISOString() ||
            new Date().toISOString(),
        };
      }
    }

    // Map creatinine to КПД
    if (latestByType["creatinine"]) {
      const creat = latestByType["creatinine"];
      result.kpd = {
        value: parseFloat(creat.value1) || creat.value1,
        date: creat.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map sodium
    if (latestByType["sodium"]) {
      const sodium = latestByType["sodium"];
      result.sodium = {
        value: parseFloat(sodium.value1) || sodium.value1,
        date: sodium.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map potassium
    if (latestByType["potassium"]) {
      const potassium = latestByType["potassium"];
      result.potassium = {
        value: parseFloat(potassium.value1) || potassium.value1,
        date: potassium.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map proBNP
    if (latestByType["probnp"]) {
      const probnp = latestByType["probnp"];
      result.probnp = {
        value: parseFloat(probnp.value1) || probnp.value1,
        date: probnp.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map ejection fraction
    if (latestByType["ejection-fraction"]) {
      const ef = latestByType["ejection-fraction"];
      result["ejection-fraction"] = {
        value: parseFloat(ef.value1) || ef.value1,
        date: ef.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map urine microalbumin
    if (latestByType["urine-microalbumin"]) {
      const microalb = latestByType["urine-microalbumin"];
      result["urine-microalbumin"] = {
        value: parseFloat(microalb.value1) || microalb.value1,
        date: microalb.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map urine creatinine
    if (latestByType["urine-creatinine"]) {
      const ucreat = latestByType["urine-creatinine"];
      result["urine-creatinine"] = {
        value: parseFloat(ucreat.value1) || ucreat.value1,
        date: ucreat.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map foot exam
    if (latestByType["foot-exam"]) {
      const foot = latestByType["foot-exam"];
      result.foot = {
        value: foot.value1,
        date: foot.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map eye exam
    if (latestByType["eye-exam"]) {
      const eye = latestByType["eye-exam"];
      result.eye = {
        value: eye.value1,
        date: eye.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map smoking
    if (latestByType["smoking"]) {
      const smoking = latestByType["smoking"];
      result.smoking = {
        value: smoking.value1 === "Да" || smoking.value1 === "true",
        date: smoking.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map echocardiography (file type)
    if (latestByType["echocardiography"]) {
      const echo = latestByType["echocardiography"];
      result.echocardiography = {
        value: echo.value1,
        date: echo.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Map ECG (file type)
    if (latestByType["ecg"]) {
      const ecg = latestByType["ecg"];
      result.ecg = {
        value: ecg.value1,
        date: ecg.createdAt?.toISOString() || new Date().toISOString(),
      };
    }

    return result;
  } catch (error) {
    console.error("Error fetching measurements:", error);
    return {};
  }
}

/**
 * Get registry data for patients in a specific condition group
 */
export async function getRegistryData(
  condition: PuzCondition,
  filters?: {
    участок?: string;
    search?: string;
    riskLevel?: RiskLevel;
    page?: number;
    limit?: number;
    accessConditions?: SQL[]; // Add patient access filtering
  }
): Promise<{ data: RegistryRow[]; total: number }> {
  try {
    const page = filters?.page || 1;
    const limit = filters?.limit || 30;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: SQL[] = [
      eq(riskGroups.name, "ПУЗ"),
      eq(riskGroups.condition, condition),
    ];

    // Add patient access conditions if provided (they already include userType check)
    if (filters?.accessConditions && filters.accessConditions.length > 0) {
      whereConditions.push(...filters.accessConditions);
    } else {
      // Fallback if no access conditions provided
      whereConditions.push(eq(users.userType, "PATIENT"));
    }

    // Get patients who have ПУЗ risk group with the specific condition
    const patientsWithCondition = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        iin: users.iin,
        telephone: users.telephone,
        city: users.city,
        district: users.district,
        settlement: users.settlement,
        village: users.village,
        subdivision: users.subdivision,
      })
      .from(users)
      .innerJoin(riskGroups, eq(riskGroups.userId, users.id))
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);

    const patients = patientsWithCondition;

    const registryRows: RegistryRow[] = [];

    for (const patient of patients) {
      const lastMeasurements = await getLatestMeasurements(patient.id);

      // Calculate overall risk
      const risks: RiskLevel[] = [];

      if (lastMeasurements.lpnp) {
        risks.push(
          evaluateRisk(lastMeasurements.lpnp.value, "lpnp", condition)
        );
      }
      if (lastMeasurements.ox) {
        risks.push(evaluateRisk(lastMeasurements.ox.value, "ox", condition));
      }
      if (lastMeasurements.sak) {
        risks.push(evaluateRisk(lastMeasurements.sak.value, "sak", condition));
      }
      if (lastMeasurements.smad?.systolic) {
        risks.push(
          evaluateRisk(lastMeasurements.smad.systolic, "smad", condition)
        );
      }
      if (lastMeasurements.bmi) {
        risks.push(evaluateRisk(lastMeasurements.bmi.value, "bmi", condition));
      }

      const overallRisk = calculateOverallRisk(risks);

      // Calculate next screening date
      const intervalMonths = getScreeningInterval(overallRisk);
      const nextScreeningDate = new Date();
      nextScreeningDate.setMonth(nextScreeningDate.getMonth() + intervalMonths);

      // Build address
      const address = [
        patient.city,
        patient.district,
        patient.settlement,
        patient.village,
      ]
        .filter(Boolean)
        .join(", ");

      const row: RegistryRow = {
        patientId: patient.id,
        fio: patient.fullName,
        iin: patient.iin || undefined,
        phone: patient.telephone,
        address: address || undefined,
        участок: patient.subdivision || undefined,
        lastMeasurements,
        overallRisk,
        nextScreeningDate: nextScreeningDate.toISOString().split("T")[0],
      };

      registryRows.push(row);
    }

    // Apply filters
    let filteredRows = registryRows;

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredRows = filteredRows.filter(
        (row) =>
          row.fio.toLowerCase().includes(searchLower) ||
          row.iin?.includes(searchLower) ||
          row.phone?.includes(searchLower)
      );
    }

    if (filters?.участок) {
      filteredRows = filteredRows.filter(
        (row) => row.участок === filters.участок
      );
    }

    if (filters?.riskLevel) {
      filteredRows = filteredRows.filter(
        (row) => row.overallRisk === filters.riskLevel
      );
    }

    return {
      data: filteredRows,
      total: filteredRows.length,
    };
  } catch (error) {
    console.error("Error fetching registry data:", error);
    return { data: [], total: 0 };
  }
}
