// Client-safe formatting utilities for ПУЗ Registry
// This file has NO database imports and can be used in client components

import {
  MeasurementValue,
  BMIValue,
  SMADValue,
  SmokingValue,
} from "@/types/puz";

/**
 * Format a cell value for display in the registry table
 */
export function formatCellValue(
  value:
    | MeasurementValue
    | BMIValue
    | SMADValue
    | SmokingValue
    | null
    | undefined,
  metricCode: string
): string {
  if (!value) return "X";

  // ECG and file-based measurements show checkmark if data exists
  if (metricCode === "ecg" || metricCode === "echocardiography") {
    return "✓";
  }

  if (metricCode === "smad" && "systolic" in value) {
    const smad = value as SMADValue;
    if (smad.systolic && smad.diastolic) {
      return `${smad.systolic}/${smad.diastolic}`;
    }
    if (smad.systolic) return String(smad.systolic);
    return "X";
  }

  if (metricCode === "bmi" && "value" in value) {
    const bmi = value as BMIValue;
    return bmi.value.toFixed(1);
  }

  if (metricCode === "smoking" && "value" in value) {
    const smoking = value as SmokingValue;
    return smoking.value ? "Да" : "Нет";
  }

  // Boolean measurements (foot, eye exams) show Да/Нет
  if ((metricCode === "foot" || metricCode === "eye") && "value" in value) {
    const mv = value as MeasurementValue;
    return mv.value === "Да" ? "Да" : "Нет";
  }

  if ("value" in value) {
    const mv = value as MeasurementValue;
    if (typeof mv.value === "number") {
      return mv.value.toFixed(1);
    }
    return String(mv.value);
  }

  return "X";
}

/**
 * Get the value for risk evaluation from a measurement
 */
export function getValueForRiskEvaluation(
  value:
    | MeasurementValue
    | BMIValue
    | SMADValue
    | SmokingValue
    | null
    | undefined,
  metricCode: string
): string | number | boolean {
  if (!value) return "";

  if (metricCode === "smad" && "systolic" in value) {
    return (value as SMADValue).systolic || 0;
  }

  if ("value" in value) {
    return (value as MeasurementValue | BMIValue | SmokingValue).value;
  }

  return "";
}

/**
 * Compute BMI from weight (kg) and height (m)
 */
export function computeBMI(weightKg: number, heightM: number): number {
  if (heightM <= 0 || weightKg <= 0) return 0;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}
