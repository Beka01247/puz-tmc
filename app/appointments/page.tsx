import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { receptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import AppointmentsClient from "./AppointmentsClient";

interface Reception {
  id: string;
  patientId: string;
  patientName: string;
  anamnesis: string;
  complaints: string;
  objectiveStatus: string;
  diagnosis: string;
  examinations: string;
  treatment: string;
  recommendations: string;
  createdAt: string;
  updatedAt: string;
}

const AppointmentsPage = async () => {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  const userType = session.user.userType as UserType;

  // Only fetch appointments for doctors
  let doctorAppointments: Reception[] = [];

  if (
    userType === UserType.DOCTOR ||
    userType === UserType.DISTRICT_DOCTOR ||
    userType === UserType.SPECIALIST_DOCTOR
  ) {
    try {
      // Get all receptions for this doctor with patient information
      const data = await db
        .select({
          id: receptions.id,
          patientId: receptions.patientId,
          patientName: users.fullName,
          anamnesis: receptions.anamnesis,
          complaints: receptions.complaints,
          objectiveStatus: receptions.objectiveStatus,
          diagnosis: receptions.diagnosis,
          examinations: receptions.examinations,
          treatment: receptions.treatment,
          recommendations: receptions.recommendations,
          createdAt: receptions.createdAt,
          updatedAt: receptions.updatedAt,
        })
        .from(receptions)
        .leftJoin(users, eq(receptions.patientId, users.id))
        .where(eq(receptions.providerId, session.user.id))
        .orderBy(receptions.createdAt);

      // Format dates
      doctorAppointments = data.map((reception) => ({
        ...reception,
        patientName: reception.patientName || "Неизвестный пациент",
        createdAt:
          reception.createdAt instanceof Date
            ? reception.createdAt.toISOString()
            : reception.createdAt || new Date().toISOString(),
        updatedAt:
          reception.updatedAt instanceof Date
            ? reception.updatedAt.toISOString()
            : reception.updatedAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Error fetching appointments:", error);
      doctorAppointments = [];
    }
  }

  return (
    <DashboardLayout
      userType={userType}
      session={{
        fullName: session.user.fullName,
        id: session.user.id,
      }}
    >
      <AppointmentsClient appointments={doctorAppointments} />
    </DashboardLayout>
  );
};

export default AppointmentsPage;
