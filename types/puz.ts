// ПУЗ Registry Types

export type PuzCondition = "АГ" | "СД" | "ХСН";

export type RiskLevel = "red" | "yellow" | "green" | "neutral";

export interface MeasurementValue {
  value: string | number;
  date: string;
  recordedAt?: Date;
}

export interface BMIValue {
  value: number;
  date: string;
  weight?: number;
  height?: number;
}

export interface SMADValue {
  systolic?: number;
  diastolic?: number;
  date: string;
}

export interface SmokingValue {
  value: boolean;
  date: string;
}

export interface RegistryRow {
  patientId: string;
  fio: string;
  iin?: string;
  phone?: string;
  address?: string;
  участок?: string; // Medical district
  gender?: "МУЖСКОЙ" | "ЖЕНСКИЙ" | "ДРУГОЙ" | null;
  lastMeasurements: {
    kpd?: MeasurementValue; // КПД
    lpnp?: MeasurementValue; // ЛПНП
    ox?: MeasurementValue; // О.Х.
    sak?: MeasurementValue; // САК (HbA1c)
    glucose?: MeasurementValue; // Глюкоза
    rskf?: MeasurementValue; // рСКФ
    ecg?: MeasurementValue; // ЭКГ
    smad?: SMADValue; // СМАД
    eye?: MeasurementValue; // Осмотр глаз
    foot?: MeasurementValue; // Осмотр стоп
    bmi?: BMIValue | null; // ИМТ
    smoking?: SmokingValue | null; // Курение
    "urine-microalbumin"?: MeasurementValue; // Микроальбумин в моче
    "urine-creatinine"?: MeasurementValue; // Креатинин в моче
    sodium?: MeasurementValue; // Натрий
    potassium?: MeasurementValue; // Калий
    probnp?: MeasurementValue; // proBNP
    "ejection-fraction"?: MeasurementValue; // Фракция выброса
    echocardiography?: MeasurementValue; // ЭхоКГ
    "iv-category"?: SmokingValue | null; // IV категория
    "self-management-confidence"?: MeasurementValue; // Уверенность в самоменеджменте
    weight?: MeasurementValue; // Вес
    height?: MeasurementValue; // Рост
  };
  lastVisitMonthsAgo?: number;
  segment?: string;
  nextScreeningDate?: string;
  overallRisk?: RiskLevel;
}

export interface CellData {
  value: string | number;
  risk: RiskLevel;
  date?: string;
  tooltip?: string;
}

export interface RegistryFilters {
  condition: PuzCondition;
  участок?: string;
  riskLevel?: RiskLevel;
  search?: string; // FIO, IIN, phone
  page?: number;
  limit?: number;
}

export interface RegistryResponse {
  data: RegistryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
