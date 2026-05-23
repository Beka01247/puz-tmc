import { RiskLevel } from "@/types/puz";

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
  | "foot"
  | "glucose"
  | "urine-microalbumin"
  | "urine-creatinine"
  | "sodium"
  | "potassium"
  | "probnp"
  | "ejection-fraction"
  | "echocardiography"
  | "iv-category"
  | "self-management-confidence"
  | "weight"
  | "height";

/**
 * Returns the recommended measurement interval in months based on risk level
 * TODO: Update these intervals for each specific measurement type
 */
export function getMeasurementInterval(
  metricCode: MetricCode,
  risk: RiskLevel
): number {
  // TODO: Customize intervals for each measurement type
  switch (risk) {
    case "green":
      return 12; // TODO: Update for each metric
    case "yellow":
      return 6; // TODO: Update for each metric
    case "red":
      return 3; // TODO: Update for each metric
    default:
      return 12;
  }
}

/**
 * Checks if a measurement is overdue based on the last measurement date and risk level
 * Returns null if no measurement exists (X), otherwise returns true/false
 */
export function isMeasurementOverdue(
  lastMeasurementDate: Date | undefined,
  metricCode: MetricCode,
  risk: RiskLevel
): boolean | null {
  // No measurement exists (X in table) - return null (no warning needed)
  if (!lastMeasurementDate) {
    return null;
  }

  const intervalMonths = getMeasurementInterval(metricCode, risk);
  const now = new Date();
  const monthsSinceLastMeasurement =
    (now.getTime() - lastMeasurementDate.getTime()) /
    (1000 * 60 * 60 * 24 * 30.44); // Average days per month

  return monthsSinceLastMeasurement > intervalMonths;
}

/**
 * Returns a warning message for overdue measurements
 */
export function getOverdueWarningMessage(
  metricCode: MetricCode,
  risk: RiskLevel,
  lastMeasurementDate: Date
): string {
  const intervalMonths = getMeasurementInterval(metricCode, risk);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastMeasurementDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const monthText =
    intervalMonths === 1 ? "месяц" : intervalMonths < 5 ? "месяца" : "месяцев";

  return `Просрочено\nПоследнее: ${daysSince} дн. назад\nИнтервал: ${intervalMonths} ${monthText}`;
}
