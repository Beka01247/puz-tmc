import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db/drizzle";
import { treatments, users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Treatment {
  id: string;
  text: string; // Combined medication, dosage, frequency, duration
  date: string; // Formatted createdAt
  doctor: string; // Provider's fullName
}

async function fetchTreatments(patientId: string): Promise<Treatment[]> {
  try {
    const data = await db
      .select({
        id: treatments.id,
        medication: treatments.medication,
        dosage: treatments.dosage,
        frequency: treatments.frequency,
        duration: treatments.duration,
        createdAt: treatments.createdAt,
        doctorName: users.fullName,
      })
      .from(treatments)
      .leftJoin(users, eq(users.id, treatments.providerId))
      .where(eq(treatments.patientId, patientId));

    return data.map((record) => ({
      id: record.id,
      text: `${record.medication}, ${record.dosage}, ${record.frequency}, ${record.duration}`,
      date: record.createdAt
        ? new Date(record.createdAt).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Дата не указана",
      doctor: record.doctorName || "Неизвестный врач",
    }));
  } catch (error) {
    console.error("Error fetching treatments:", error);
    return [];
  }
}

const TherapyPage = async () => {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/sign-in");
  }

  const userType = session.user.userType as UserType;

  if (userType !== UserType.PATIENT) {
    redirect("/");
  }

  const treatments = await fetchTreatments(session.user.id);

  return (
    <DashboardLayout
      userType={userType}
      session={{
        fullName: session.user.fullName,
      }}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Лечение</h2>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Лечение</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Врач</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {treatments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Нет назначений лечения
                  </TableCell>
                </TableRow>
              ) : (
                treatments.map((treatment) => (
                  <TableRow key={treatment.id}>
                    <TableCell>{treatment.text}</TableCell>
                    <TableCell>{treatment.date}</TableCell>
                    <TableCell>{treatment.doctor}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TherapyPage;
