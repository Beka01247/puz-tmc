export enum UserType {
  DISTRICT_DOCTOR = "DISTRICT_DOCTOR", // Участковый врач
  SPECIALIST_DOCTOR = "SPECIALIST_DOCTOR", // Узкий специалист
  NURSE = "NURSE", // Медсестра
  PATIENT = "PATIENT", // Пациент
  DOCTOR = "DOCTOR",
  REGIONAL_ADMIN = "REGIONAL_ADMIN", // Администратор области
  CITY_ADMIN = "CITY_ADMIN", // Администратор города
  DISTRICT_ADMIN = "DISTRICT_ADMIN", // Администратор района
}

export const userTypeLabels = {
  [UserType.DISTRICT_DOCTOR]: "Участковый врач (ВОП, терапевт, педиатр)",
  [UserType.SPECIALIST_DOCTOR]: "Узкий специалист",
  [UserType.DOCTOR]: "Доктор",
  [UserType.NURSE]: "Медсестра",
  [UserType.PATIENT]: "Пациент",
  [UserType.REGIONAL_ADMIN]: "Администратор области",
  [UserType.CITY_ADMIN]: "Администратор города",
  [UserType.DISTRICT_ADMIN]: "Администратор района",
};

// Дополнительные поля для докторов и администраторов
export const userTypeFields = {
  [UserType.DISTRICT_DOCTOR]: {
    department: "Отделение",
    subdivision: "Подразделение",
    district: "Участок",
  },
  [UserType.SPECIALIST_DOCTOR]: {
    specialization: "Специальность",
    subdivision: "Подразделение",
  },
  [UserType.REGIONAL_ADMIN]: {
    region: "Область",
  },
  [UserType.CITY_ADMIN]: {
    city: "Город",
  },
  [UserType.DISTRICT_ADMIN]: {
    city: "Город",
    district: "Район",
  },
};
