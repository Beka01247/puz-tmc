// Helper functions for formatting user data
export const formatGender = (gender: string | null) => {
  switch (gender) {
    case "МУЖСКОЙ":
      return "Мужской";
    case "ЖЕНСКИЙ":
      return "Женский";
    case "ДРУГОЙ":
      return "Другой";
    default:
      return "Не указан";
  }
};

export const formatUserType = (userType: string | null) => {
  switch (userType) {
    case "DOCTOR":
      return "Врач";
    case "NURSE":
      return "Медсестра";
    case "PATIENT":
      return "Пациент";
    default:
      return "Неизвестно";
  }
};

export const formatDoctorType = (doctorType: string | null) => {
  switch (doctorType) {
    case "GENERAL":
      return "Терапевт";
    case "SPECIALIST":
      return "Специалист";
    default:
      return "Неизвестно";
  }
};
