import { db } from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { format, parse } from "date-fns";
import {
  invitations,
  users,
  patientScreenings,
  screenings,
  patientVaccinations,
} from "@/db/schema";

export interface MedicalActivity {
  id: string;
  type: "INVITATION" | "SCREENING" | "VACCINATION";
  title: string;
  date: string;
  doctor: string;
  status: string;
  notes?: string | null;
}

export async function fetchMedicalActivities(
  patientId: string
): Promise<MedicalActivity[]> {
  try {
    // Fetch invitations
    const invitationsData = await db
      .select({
        id: invitations.id,
        riskGroup: invitations.riskGroup,
        createdAt: invitations.createdAt,
        doctorName: users.fullName,
        status: invitations.status,
      })
      .from(invitations)
      .leftJoin(users, eq(users.id, invitations.providerId))
      .where(eq(invitations.patientId, patientId));

    // Fetch screenings
    const screeningsData = await db
      .select({
        id: patientScreenings.id,
        screeningName: screenings.name,
        scheduledDate: patientScreenings.scheduledDate,
        doctorName: users.fullName,
        status: patientScreenings.status,
        notes: patientScreenings.notes,
      })
      .from(patientScreenings)
      .leftJoin(users, eq(patientScreenings.providerId, users.id))
      .leftJoin(screenings, eq(patientScreenings.screeningId, screenings.id))
      .where(eq(patientScreenings.patientId, patientId));

    // Fetch vaccinations
    const vaccinationsData = await db
      .select({
        id: patientVaccinations.id,
        name: patientVaccinations.name,
        scheduledDate: patientVaccinations.scheduledDate,
        doctorName: users.fullName,
        status: patientVaccinations.status,
        notes: patientVaccinations.notes,
      })
      .from(patientVaccinations)
      .leftJoin(users, eq(patientVaccinations.id, users.id))
      .where(eq(patientVaccinations.patientId, patientId));

    // Convert invitations to MedicalActivity
    const invitationActivities: MedicalActivity[] = invitationsData.map(
      (record) => ({
        id: record.id,
        type: "INVITATION",
        title: record.riskGroup,
        date: record.createdAt
          ? format(new Date(record.createdAt), "dd.MM.yyyy HH:mm")
          : "Дата не указана",
        doctor: record.doctorName || "Неизвестный врач",
        status: record.status || "PENDING",
      })
    );

    // Convert screenings to MedicalActivity
    const screeningActivities: MedicalActivity[] = screeningsData.map(
      (record) => ({
        id: record.id,
        type: "SCREENING",
        title: record.screeningName || "Без названия",
        date: record.scheduledDate
          ? format(new Date(record.scheduledDate), "dd.MM.yyyy")
          : "Дата не указана",
        doctor: record.doctorName || "Не назначен",
        status: record.status || "INVITED",
        notes: record.notes,
      })
    );

    // Convert vaccinations to MedicalActivity
    const vaccinationActivities: MedicalActivity[] = vaccinationsData.map(
      (record) => ({
        id: record.id,
        type: "VACCINATION",
        title: record.name || "Без названия",
        date: record.scheduledDate
          ? format(new Date(record.scheduledDate), "dd.MM.yyyy")
          : "Дата не указана",
        doctor: record.doctorName || "Не назначен",
        status: record.status || "INVITED",
        notes: record.notes,
      })
    );

    // Combine all activities and sort by date
    return [
      ...invitationActivities,
      ...screeningActivities,
      ...vaccinationActivities,
    ].sort((a, b) => {
      const dateA =
        a.date === "Дата не указана"
          ? new Date(0)
          : parse(a.date, "dd.MM.yyyy", new Date());
      const dateB =
        b.date === "Дата не указана"
          ? new Date(0)
          : parse(b.date, "dd.MM.yyyy", new Date());
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error("Error fetching medical activities:", error);
    return [];
  }
}
