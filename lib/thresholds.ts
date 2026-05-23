// ПУЗ Thresholds Configuration
// Configurable thresholds for different conditions and metrics

import { RiskLevel, PuzCondition } from "@/types/puz";

export interface ThresholdRule {
  red?: { min?: number; max?: number };
  yellow?: { min?: number; max?: number };
  green?: { min?: number; max?: number };
  // For categorical values
  categorical?: {
    red?: string[];
    yellow?: string[];
    green?: string[];
  };
}

export type MetricCode =
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
  | "weight"
  | "height"
  | "glucose"
  | "urine-microalbumin"
  | "urine-creatinine"
  | "foot"
  | "sodium"
  | "potassium"
  | "probnp"
  | "ejection-fraction"
  | "echocardiography"
  | "iv-category"
  | "self-management-confidence";

// Mapping between measurement types in DB and metric codes
export const MEASUREMENT_TYPE_MAP: Record<string, string> = {
  // Blood pressure for SMAD
  "blood-pressure": "smad",
  // Cholesterol related
  "ldl-cholesterol": "lpnp", // LDL cholesterol
  "total-cholesterol": "ox", // Total cholesterol
  cholesterol: "lpnp", // Legacy - LDL cholesterol
  triglycerides: "ox", // Legacy - can be used for total cholesterol approximation
  // Kidney function
  egfr: "rskf", // estimated Glomerular Filtration Rate
  creatinine: "kpd", // Creatinine for КПД
  // Diabetes
  glucose: "glucose", // Blood sugar
  hba1c: "sak", // HbA1c
  // Urine tests
  "urine-microalbumin": "urine-microalbumin",
  "urine-creatinine": "urine-creatinine",
  // Physical exams
  "foot-exam": "foot",
  "eye-exam": "eye",
  // BMI calculation
  bmi: "bmi", // Direct BMI value
  weight: "weight", // Used for BMI calculation
  height: "height", // Used for BMI calculation
  // Lifestyle
  smoking: "smoking",
  "iv-category": "iv-category",
  // Self-management assessment
  "self-management-confidence": "self-management-confidence",
  // Heart failure specific
  sodium: "sodium",
  potassium: "potassium",
  probnp: "probnp",
  "ejection-fraction": "ejection-fraction",
  echocardiography: "echocardiography",
  // Note: kpd, ecg - these will be handled via files table or custom fields
} as const;

// Thresholds for АГ (Arterial Hypertension)
export const AG_THRESHOLDS: Record<MetricCode, ThresholdRule> = {
  // КПД (Coefficient of Patient Dispensary observation)
  kpd: {
    categorical: {
      green: ["normal", "нормальный", "удовлетворительный"],
      yellow: ["borderline", "пограничный", "требует внимания"],
      red: ["abnormal", "патологический", "критический"],
    },
  },

  // ЛПНП (LDL Cholesterol) - mmol/L
  lpnp: {
    green: { max: 3.0 },
    yellow: { min: 3.0, max: 4.9 },
    red: { min: 4.9 },
  },

  // О.Х. (Total Cholesterol) - mmol/L
  ox: {
    green: { max: 5.0 },
    yellow: { min: 5.0, max: 6.2 },
    red: { min: 6.2 },
  },

  // САК (Blood Sugar / Glucose) - mmol/L
  sak: {
    green: { min: 3.9, max: 5.5 },
    yellow: { min: 5.5, max: 6.9 },
    red: { min: 6.9 },
  },

  // рСКФ (eGFR - estimated Glomerular Filtration Rate) - mL/min/1.73m²
  rskf: {
    green: { min: 90 },
    yellow: { min: 60, max: 89 },
    red: { max: 59 },
  },

  // ЭКГ (ECG)
  ecg: {
    categorical: {
      green: ["normal", "норма", "нормальный"],
      yellow: [
        "borderline",
        "пограничный",
        "требует наблюдения",
        "незначительные изменения",
      ],
      red: ["abnormal", "патология", "критический", "требует вмешательства"],
    },
  },

  // СМАД (24-hour Blood Pressure Monitoring) - mmHg
  smad: {
    green: { max: 130 }, // systolic
    yellow: { min: 130, max: 139 },
    red: { min: 140 },
  },

  // Осмотр глаз (Eye examination)
  eye: {
    categorical: {
      green: ["normal", "норма", "здоровый"],
      yellow: ["borderline", "требует наблюдения", "начальные изменения"],
      red: ["abnormal", "патология", "ретинопатия"],
    },
  },

  // ИМТ (BMI - Body Mass Index) - kg/m²
  bmi: {
    green: { min: 18.5, max: 24.9 },
    yellow: { min: 18.0, max: 29.9 }, // Simplified - covers both underweight and overweight
    red: { min: 30 }, // obese
  },

  // Курение (Smoking)
  smoking: {
    categorical: {
      green: ["false", "Нет", "No"],
      red: ["true", "Да", "Yes"],
    },
  },

  // IV категория
  "iv-category": {
    categorical: {
      green: ["false", "Нет", "No", "true", "Да", "Yes"],
    },
  },

  // Микроальбумин в моче - mg/L
  "urine-microalbumin": {
    green: { max: 30 },
    yellow: { min: 30, max: 300 },
    red: { min: 300 },
  },

  // Креатинин в моче - mmol/L
  "urine-creatinine": {
    green: { min: 8.8, max: 17.7 },
    yellow: { min: 5.0, max: 8.8 },
    red: { max: 5.0 },
  },

  // Глюкоза (Glucose) - Not primary for АГ, but included
  glucose: {
    green: { min: 4.0, max: 6.1 },
    yellow: { min: 6.1, max: 7.0 },
    red: { min: 7.0 },
  },

  // Осмотр стоп (Foot Exam) - Not primary for АГ
  foot: {},

  // Натрий (Sodium) - Not primary for АГ
  sodium: {},

  // Калий (Potassium) - Not primary for АГ
  potassium: {},

  // proBNP - Not primary for АГ
  probnp: {},

  // ФВ (Ejection Fraction) - Not primary for АГ
  "ejection-fraction": {},

  // Эхокардиография (Echocardiography) - Not primary for АГ
  echocardiography: {},

  // Уверенность в самоменеджменте (Self-Management Confidence) - 0-10 scale
  "self-management-confidence": {
    green: { min: 7, max: 10 },
    yellow: { min: 4, max: 6 },
    red: { min: 0, max: 3 },
  },

  // Weight and height are not evaluated directly
  weight: {},
  height: {},
};

// Thresholds for СД (Diabetes)
export const SD_THRESHOLDS: Record<MetricCode, ThresholdRule> = {
  ...AG_THRESHOLDS, // Start with same thresholds

  // Глюкоза (Glucose) - mmol/L
  glucose: {
    green: { min: 4.0, max: 7.0 },
    yellow: { min: 7.0, max: 10.0 },
    red: { min: 10.0 },
  },

  // САК (HbA1c) - %
  sak: {
    green: { max: 7.0 },
    yellow: { min: 7.0, max: 8.0 },
    red: { min: 8.0 },
  },

  // Микроальбумин в моче - mg/L
  "urine-microalbumin": {
    green: { max: 30 },
    yellow: { min: 30, max: 300 },
    red: { min: 300 },
  },

  // Креатинин в моче - mmol/L
  "urine-creatinine": {
    green: { min: 8.8, max: 17.7 },
    yellow: { min: 5.0, max: 8.8 },
    red: { max: 5.0 },
  },

  // Осмотр стоп (Foot Exam)
  foot: {
    categorical: {
      green: ["normal", "норма", "нормальный", "без патологий"],
      yellow: ["borderline", "пограничный", "требует наблюдения", "мозоли"],
      red: ["abnormal", "патологический", "язвы", "раны", "инфекция"],
    },
  },
};

// Thresholds for ХСН (Chronic Heart Failure)
export const HSN_THRESHOLDS: Record<MetricCode, ThresholdRule> = {
  ...AG_THRESHOLDS, // Start with same thresholds

  // Натрий (Sodium) - mmol/L
  sodium: {
    green: { min: 135, max: 145 },
    yellow: { min: 130, max: 150 },
    red: { max: 130 },
  },

  // Калий (Potassium) - mmol/L
  potassium: {
    green: { min: 3.5, max: 5.0 },
    yellow: { min: 3.0, max: 5.5 },
    red: { max: 3.0 },
  },

  // proBNP - pg/ml
  probnp: {
    green: { max: 125 },
    yellow: { min: 125, max: 300 },
    red: { min: 300 },
  },

  // ФВ (Ejection Fraction) - %
  "ejection-fraction": {
    green: { min: 50 },
    yellow: { min: 40, max: 49 },
    red: { max: 39 },
  },

  // Эхокардиография (Echocardiography)
  echocardiography: {
    categorical: {
      green: ["normal", "норма", "нормальный"],
      yellow: ["borderline", "пограничный", "незначительные изменения"],
      red: ["abnormal", "патология", "выраженные изменения"],
    },
  },
};

// Get thresholds based on condition
export function getThresholds(
  condition: PuzCondition
): Record<MetricCode, ThresholdRule> {
  switch (condition) {
    case "АГ":
      return AG_THRESHOLDS;
    case "СД":
      return SD_THRESHOLDS;
    case "ХСН":
      return HSN_THRESHOLDS;
    default:
      return AG_THRESHOLDS;
  }
}

// Evaluate risk level based on value and threshold
export function evaluateRisk(
  value: string | number | boolean,
  metricCode: MetricCode,
  condition: PuzCondition = "АГ"
): RiskLevel {
  const thresholds = getThresholds(condition);
  const rule = thresholds[metricCode];

  if (!rule) return "neutral";

  // Handle categorical values
  if (rule.categorical) {
    const strValue = String(value).toLowerCase();

    if (rule.categorical.red?.some((v) => strValue.includes(v.toLowerCase()))) {
      return "red";
    }
    if (
      rule.categorical.yellow?.some((v) => strValue.includes(v.toLowerCase()))
    ) {
      return "yellow";
    }
    if (
      rule.categorical.green?.some((v) => strValue.includes(v.toLowerCase()))
    ) {
      return "green";
    }
    return "neutral";
  }

  // Handle numeric values
  const numValue = parseFloat(String(value));
  if (isNaN(numValue)) return "neutral";

  // Special handling for BMI (has two yellow ranges)
  if (metricCode === "bmi") {
    if (numValue >= 30) return "red";
    if (numValue >= 25 && numValue < 30) return "yellow";
    if (numValue >= 18.5 && numValue < 25) return "green";
    if (numValue < 18.5) return "yellow";
    return "neutral";
  }

  // Check red range
  if (rule.red) {
    if (
      (rule.red.min !== undefined && numValue >= rule.red.min) ||
      (rule.red.max !== undefined && numValue <= rule.red.max)
    ) {
      // If both min and max are defined, check if value is in range
      if (rule.red.min !== undefined && rule.red.max !== undefined) {
        if (numValue >= rule.red.min && numValue <= rule.red.max) {
          return "red";
        }
      } else {
        return "red";
      }
    }
  }

  // Check yellow range
  if (rule.yellow) {
    if (rule.yellow.min !== undefined && rule.yellow.max !== undefined) {
      if (numValue >= rule.yellow.min && numValue <= rule.yellow.max) {
        return "yellow";
      }
    } else if (
      (rule.yellow.min !== undefined && numValue >= rule.yellow.min) ||
      (rule.yellow.max !== undefined && numValue <= rule.yellow.max)
    ) {
      return "yellow";
    }
  }

  // Check green range
  if (rule.green) {
    if (rule.green.min !== undefined && rule.green.max !== undefined) {
      if (numValue >= rule.green.min && numValue <= rule.green.max) {
        return "green";
      }
    } else if (
      (rule.green.min !== undefined && numValue >= rule.green.min) ||
      (rule.green.max !== undefined && numValue <= rule.green.max)
    ) {
      return "green";
    }
  }

  return "neutral";
}

// Calculate screening interval in months based on risk
export function getScreeningInterval(overallRisk: RiskLevel): number {
  switch (overallRisk) {
    case "red":
      return 3;
    case "yellow":
      return 6;
    case "green":
      return 12;
    default:
      return 12;
  }
}

// Determine overall risk from individual metric risks
export function calculateOverallRisk(risks: RiskLevel[]): RiskLevel {
  if (risks.includes("red")) return "red";
  if (risks.includes("yellow")) return "yellow";
  if (risks.includes("green")) return "green";
  return "neutral";
}
