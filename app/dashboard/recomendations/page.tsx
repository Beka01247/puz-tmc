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
import { recommendations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Recommendation {
  id: string;
  text: string; // Recommendation description
  date: string; // Formatted createdAt
  doctor: string; // Provider's fullName
}

async function fetchRecommendations(
  patientId: string
): Promise<Recommendation[]> {
  try {
    const data = await db
      .select({
        id: recommendations.id,
        description: recommendations.description,
        createdAt: recommendations.createdAt,
        doctorName: users.fullName,
      })
      .from(recommendations)
      .leftJoin(users, eq(users.id, recommendations.providerId))
      .where(eq(recommendations.patientId, patientId));

    return data.map((record) => ({
      id: record.id,
      text: record.description,
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
    console.error("Error fetching recommendations:", error);
    return [];
  }
}

const RecommendationsPage = async () => {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/sign-in");
  }

  const userType = session.user.userType as UserType;

  if (userType !== UserType.PATIENT) {
    redirect("/");
  }

  const recommendations = await fetchRecommendations(session.user.id);

  return (
    <DashboardLayout
      userType={userType}
      session={{
        fullName: session.user.fullName,
      }}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Рекомендации</h2>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Рекомендация</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Врач</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Нет рекомендаций
                  </TableCell>
                </TableRow>
              ) : (
                recommendations.map((recommendation) => (
                  <TableRow key={recommendation.id}>
                    <TableCell>{recommendation.text}</TableCell>
                    <TableCell>{recommendation.date}</TableCell>
                    <TableCell>{recommendation.doctor}</TableCell>
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

export default RecommendationsPage;
