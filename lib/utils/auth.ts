/**
 * Check if a user has doctor privileges (can diagnose, etc.)
 */
export function isDoctorRole(userType: string): boolean {
  return (
    userType === "DOCTOR" ||
    userType === "DISTRICT_DOCTOR" ||
    userType === "SPECIALIST_DOCTOR"
  );
}

/**
 * Check if a user has medical provider privileges (can treat patients, view patient data, etc.)
 */
export function isMedicalProvider(userType: string): boolean {
  return (
    userType === "DOCTOR" ||
    userType === "DISTRICT_DOCTOR" ||
    userType === "SPECIALIST_DOCTOR" ||
    userType === "NURSE"
  );
}

/**
 * Check if a user can perform administrative medical actions (screenings, fertile women register, etc.)
 */
export function canPerformMedicalActions(userType: string): boolean {
  return (
    userType === "DISTRICT_DOCTOR" ||
    userType === "SPECIALIST_DOCTOR" ||
    userType === "NURSE"
  );
}
