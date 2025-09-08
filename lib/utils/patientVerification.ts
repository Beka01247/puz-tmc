import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canAccessPatient } from "./patientAccess";

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
 * Verify that a patient exists and that the current user can access them
 * Returns the patient data if accessible, throws error if not
 */
export async function verifyPatientAccess(
  patientId: string,
  user: UserSession
) {
  // Get patient details
  const [patient] = await db
    .select({
      id: users.id,
      region: users.region,
      city: users.city,
      district: users.district,
      settlement: users.settlement,
      village: users.village,
      organization: users.organization,
    })
    .from(users)
    .where(and(eq(users.id, patientId), eq(users.userType, "PATIENT")));

  if (!patient) {
    throw new Error("Пациент не найден");
  }

  // Check access permissions
  const hasAccess = canAccessPatient(user, {
    region: patient.region || undefined,
    city: patient.city,
    district: patient.district || undefined,
    settlement: patient.settlement || undefined,
    village: patient.village || undefined,
    organization: patient.organization,
  });

  if (!hasAccess) {
    throw new Error("Доступ запрещен");
  }

  return patient;
}
