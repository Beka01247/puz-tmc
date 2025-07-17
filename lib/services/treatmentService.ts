import { db } from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { treatments, treatmentTimes, users } from "@/db/schema";

interface TreatmentTime {
  id: string;
  time: string;
}

export interface Treatment {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
  providerName: string | null;
  times: TreatmentTime[];
  createdAt: string;
}

export async function fetchPatientTreatments(
  patientId: string
): Promise<Treatment[]> {
  try {
    // Fetch treatments with provider name
    const treatmentsData = await db
      .select({
        id: treatments.id,
        medication: treatments.medication,
        dosage: treatments.dosage,
        frequency: treatments.frequency,
        duration: treatments.duration,
        notes: treatments.notes,
        providerName: users.fullName,
        createdAt: treatments.createdAt,
      })
      .from(treatments)
      .leftJoin(users, eq(treatments.providerId, users.id))
      .where(eq(treatments.patientId, patientId));

    // Fetch treatment times for each treatment
    const treatmentsWithTimes = await Promise.all(
      treatmentsData.map(async (treatment) => {
        const times = await db
          .select({
            id: treatmentTimes.id,
            timeOfDay: treatmentTimes.timeOfDay,
          })
          .from(treatmentTimes)
          .where(eq(treatmentTimes.treatmentId, treatment.id));

        return {
          ...treatment,
          times: times.map((t) => ({ id: t.id, time: t.timeOfDay })),
          createdAt: format(new Date(treatment.createdAt!), "dd.MM.yyyy"),
        };
      })
    );

    return treatmentsWithTimes;
  } catch (error) {
    console.error("Error fetching patient treatments:", error);
    return [];
  }
}
