import { SQL, eq, ilike } from "drizzle-orm";
import { users } from "@/db/schema";

interface UserSession {
  userType: string;
  region?: string;
  city: string;
  district?: string;
  settlement?: string;
  village?: string;
  organization: string;
  department?: string;
  subdivision?: string;
}

/**
 * Generate WHERE conditions for patient access based on user role and geographic hierarchy
 */
export function getPatientAccessConditions(user: UserSession): SQL[] {
  const conditions: SQL[] = [eq(users.userType, "PATIENT")];

  switch (user.userType) {
    case "REGIONAL_ADMIN":
      // Can see all patients in their region
      if (user.region) {
        conditions.push(eq(users.region!, user.region));
      } else {
        // Fallback to city if no region specified
        conditions.push(eq(users.city, user.city));
      }
      break;

    case "CITY_ADMIN":
      // Can see all patients in their city
      conditions.push(eq(users.city, user.city));
      break;

    case "DISTRICT_ADMIN":
      // Can see all patients in their district
      if (user.district) {
        conditions.push(eq(users.city, user.city));
        // Add district condition separately to handle null comparison safely
        conditions.push(eq(users.district, user.district));
      } else {
        conditions.push(eq(users.city, user.city));
      }
      break;

    case "DISTRICT_DOCTOR":
    case "SPECIALIST_DOCTOR":
    case "DOCTOR":
    case "NURSE":
    default:
      // Traditional access: same organization and city
      conditions.push(ilike(users.organization, user.organization));
      conditions.push(ilike(users.city, user.city));
      break;
  }

  return conditions;
}

/**
 * Check if a user can access a specific patient
 */
export function canAccessPatient(
  user: UserSession,
  patient: {
    region?: string;
    city: string;
    district?: string;
    settlement?: string;
    village?: string;
    organization: string;
  }
): boolean {
  switch (user.userType) {
    case "REGIONAL_ADMIN":
      return user.region
        ? patient.region === user.region
        : patient.city === user.city;

    case "CITY_ADMIN":
      return patient.city === user.city;

    case "DISTRICT_ADMIN":
      return (
        patient.city === user.city &&
        (user.district ? patient.district === user.district : true)
      );

    case "DISTRICT_DOCTOR":
    case "SPECIALIST_DOCTOR":
    case "DOCTOR":
    case "NURSE":
    default:
      return (
        patient.organization.toLowerCase() ===
          user.organization.toLowerCase() &&
        patient.city.toLowerCase() === user.city.toLowerCase()
      );
  }
}
