// Mock data for ПУЗ Registry (АГ - Arterial Hypertension)

import { RegistryRow } from "@/types/puz";

export const mockPuzRegistryData: RegistryRow[] = [
  {
    patientId: "mock-1",
    fio: "Канышулы Идрис",
    iin: "770551111111",
    phone: "+77075090442",
    address: "Мичаево 21",
    участок: "Участок №22",
    lastMeasurements: {
      lpnp: { value: 4.05, date: "2025-10-15" },
      ox: { value: 5.2, date: "2025-10-15" },
      sak: { value: 4.5, date: "2025-10-12" },
      smad: { systolic: 130, diastolic: 80, date: "2025-10-10" },
      bmi: { value: 28.41, date: "2025-10-05", weight: 75, height: 1.63 },
      smoking: { value: false, date: "2025-09-01" },
      rskf: { value: 85.5, date: "2025-09-20" },
    },
    overallRisk: "yellow",
    nextScreeningDate: "2026-05-18",
  },
  {
    patientId: "mock-2",
    fio: "Сериков Бекарыс",
    iin: "770531111111",
    phone: "+77053111491",
    address: "Поселок 5/1",
    участок: "Участок №49",
    lastMeasurements: {
      lpnp: { value: 3.0, date: "2025-11-01" },
      ox: { value: 4.8, date: "2025-11-01" },
      sak: { value: 2.9, date: "2025-10-28" },
      smad: { systolic: 120, diastolic: 75, date: "2025-10-25" },
      bmi: { value: 23.26, date: "2025-10-20", weight: 70, height: 1.73 },
      smoking: { value: false, date: "2025-09-15" },
      rskf: { value: 102.42, date: "2025-10-01" },
      ecg: { value: "норма", date: "2025-10-05" },
    },
    overallRisk: "green",
    nextScreeningDate: "2026-11-18",
  },
  {
    patientId: "mock-3",
    fio: "Асанали Рашид",
    iin: "770156669442",
    phone: "+77016669442",
    address: "ПРОСПЕКТ РЕСПУБЛИКИ, ДОМ 10/1",
    участок: "Участок №51",
    lastMeasurements: {
      lpnp: { value: 5.9, date: "2025-09-10" },
      ox: { value: 6.5, date: "2025-09-10" },
      sak: { value: 2.9, date: "2025-09-08" },
      smad: { systolic: 148, diastolic: 95, date: "2025-09-05" },
      bmi: { value: 32.41, date: "2025-09-01", weight: 95, height: 1.71 },
      smoking: { value: true, date: "2025-08-20" },
      rskf: { value: 65.61, date: "2025-08-25" },
    },
    overallRisk: "red",
    nextScreeningDate: "2026-02-18",
  },
  {
    patientId: "mock-4",
    fio: "Жанабаев Даниал",
    iin: "770226103153",
    phone: "+77022610315",
    address: "ПРОСПЕКТ РЕСПУБЛИКИ, ДОМ 10",
    участок: "Участок №51",
    lastMeasurements: {
      lpnp: { value: 4.5, date: "2025-11-10" },
      ox: { value: 5.7, date: "2025-11-10" },
      sak: { value: 4.7, date: "2025-11-08" },
      smad: { systolic: 135, diastolic: 85, date: "2025-11-05" },
      bmi: { value: 27.55, date: "2025-11-01", weight: 68, height: 1.58 },
      smoking: { value: false, date: "2025-10-15" },
      rskf: { value: 73.59, date: "2025-10-20" },
    },
    overallRisk: "yellow",
    nextScreeningDate: "2026-05-18",
  },
  {
    patientId: "mock-5",
    fio: "ШАЛАГАЕВА КОРЛЫСАЙ САЙЛАУҚЫЗЫ",
    iin: "770226076044",
    phone: "+77022607604",
    address: "Республика тағы на 15",
    участок: "Участок №59",
    lastMeasurements: {
      lpnp: { value: 2.7, date: "2025-11-12" },
      ox: { value: 4.7, date: "2025-11-12" },
      sak: { value: 3.7, date: "2025-11-10" },
      smad: { systolic: 125, diastolic: 78, date: "2025-11-08" },
      bmi: { value: 22.9, date: "2025-11-05", weight: 65, height: 1.69 },
      smoking: { value: false, date: "2025-10-20" },
      rskf: { value: 113.67, date: "2025-10-25" },
      eye: { value: "норма", date: "2025-10-28" },
    },
    overallRisk: "green",
    nextScreeningDate: "2026-11-18",
  },
  {
    patientId: "mock-6",
    fio: "АРСЛАНОВА КЛАРА БАТЫРХАНОВНА",
    iin: "770174513827",
    phone: "+77017451382",
    address: "Гагдулина 9/1 тағы на 01",
    участок: "Участок №53",
    lastMeasurements: {
      lpnp: { value: 3.7, date: "2025-10-20" },
      ox: { value: 5.8, date: "2025-10-20" },
      sak: { value: 3.7, date: "2025-10-18" },
      smad: { systolic: 142, diastolic: 88, date: "2025-10-15" },
      bmi: { value: 29.66, date: "2025-10-10", weight: 72, height: 1.56 },
      smoking: { value: false, date: "2025-09-25" },
      rskf: { value: 66.56, date: "2025-09-30" },
    },
    overallRisk: "red",
    nextScreeningDate: "2026-02-18",
  },
  {
    patientId: "mock-7",
    fio: "БАЛА ЛОВ НАТАЛЬЯ ЦИКРЕВА",
    iin: "770174914309",
    phone: "+77017491430",
    address: "Гагдулина 9/1 тағы на 15",
    участок: "Участок №01",
    lastMeasurements: {
      lpnp: { value: 4.4, date: "2025-11-05" },
      ox: { value: 5.4, date: "2025-11-05" },
      sak: { value: 5.0, date: "2025-11-03" },
      smad: { systolic: 128, diastolic: 82, date: "2025-11-01" },
      bmi: { value: 32.91, date: "2025-10-28", weight: 88, height: 1.64 },
      smoking: { value: false, date: "2025-10-15" },
      rskf: { value: 97.11, date: "2025-10-20" },
    },
    overallRisk: "yellow",
    nextScreeningDate: "2026-05-18",
  },
  {
    patientId: "mock-8",
    fio: "НАУМЧЕНКО СВЕТЛАНА МИХАЙЛОВНА",
    iin: "770224111905",
    phone: "+77022411190",
    address: "Гагдулина 9/3 тағы на 25",
    участок: "Участок №51",
    lastMeasurements: {
      ox: { value: 4.6, date: "2025-10-30" },
      sak: { value: 3.1, date: "2025-10-28" },
      smad: { systolic: 122, diastolic: 76, date: "2025-10-25" },
      bmi: { value: 27.31, date: "2025-10-20", weight: 70, height: 1.6 },
      smoking: { value: false, date: "2025-10-10" },
      rskf: { value: 65.27, date: "2025-10-15" },
    },
    overallRisk: "yellow",
    nextScreeningDate: "2026-05-18",
  },
  {
    patientId: "mock-9",
    fio: "КАРАХАНОВА АЙСУЛУ ШАМШИГАЕВА",
    iin: "777252161157",
    phone: "+77725216115",
    address: "Кагыбай батыра 4",
    участок: "Участок №26",
    lastMeasurements: {
      lpnp: { value: 4.8, date: "2025-08-15" },
      ox: { value: 5.8, date: "2025-08-15" },
      sak: { value: 2.9, date: "2025-08-12" },
      smad: { systolic: 145, diastolic: 92, date: "2025-08-10" },
      bmi: { value: 27.85, date: "2025-08-05", weight: 73, height: 1.62 },
      smoking: { value: true, date: "2025-07-20" },
    },
    overallRisk: "red",
    nextScreeningDate: "2026-02-18",
  },
  {
    patientId: "mock-10",
    fio: "КОСТЕНКО НАТАЛЬЯ МИХАЙЛОВНА",
    iin: "777770209172",
    phone: "+77777020917",
    address: "Барауса 7",
    участок: "Участок №26",
    lastMeasurements: {
      lpnp: { value: 2.8, date: "2025-11-08" },
      ox: { value: 4.0, date: "2025-11-08" },
      sak: { value: 2.6, date: "2025-11-06" },
      smad: { systolic: 118, diastolic: 72, date: "2025-11-04" },
      bmi: { value: 21.88, date: "2025-11-01", weight: 62, height: 1.68 },
      smoking: { value: false, date: "2025-10-20" },
      rskf: { value: 100.1, date: "2025-10-22" },
      ecg: { value: "норма", date: "2025-10-25" },
      eye: { value: "здоровый", date: "2025-10-26" },
    },
    overallRisk: "green",
    nextScreeningDate: "2026-11-18",
  },
  {
    patientId: "mock-11",
    fio: "ПЕРЕСЬСЬКАЯ АЛЬБИНА МАРИНІВНА",
    iin: "770366950243",
    phone: "+77036695024",
    address: "хірудов 3",
    участок: "Участок №26",
    lastMeasurements: {
      sak: { value: 7.2, date: "2025-09-20" },
      smad: { systolic: 155, diastolic: 98, date: "2025-09-18" },
      bmi: { value: 34.5, date: "2025-09-15", weight: 92, height: 1.63 },
      smoking: { value: true, date: "2025-09-01" },
    },
    overallRisk: "red",
    nextScreeningDate: "2026-02-18",
  },
  {
    patientId: "mock-12",
    fio: "ПЕРЕСЛЬКО АЛЬБЕЙНА КАПАНІВНА",
    iin: "770101949350",
    phone: "+77010194935",
    address: "хірудов 9",
    участок: "Участок №26",
    lastMeasurements: {},
    overallRisk: "neutral",
    nextScreeningDate: "2026-11-18",
  },
];

// Helper to get mock data with pagination
export function getMockRegistryData(
  page: number = 1,
  limit: number = 30,
  filters?: {
    search?: string;
    участок?: string;
    riskLevel?: string;
  }
) {
  let filtered = [...mockPuzRegistryData];

  // Apply filters
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.fio.toLowerCase().includes(searchLower) ||
        row.iin?.includes(searchLower) ||
        row.phone?.includes(searchLower)
    );
  }

  if (filters?.участок) {
    filtered = filtered.filter((row) => row.участок === filters.участок);
  }

  if (filters?.riskLevel) {
    filtered = filtered.filter((row) => row.overallRisk === filters.riskLevel);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = filtered.slice(start, end);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
