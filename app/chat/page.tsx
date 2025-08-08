import { redirect } from "next/navigation";
import { Suspense } from "react";
import ChatWrapper from "@/components/ChatWrapper";
import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { auth } from "@/auth";
import { UserType } from "@/constants/userTypes";
import Link from "next/link";

interface ChatPageProps {
  searchParams: Promise<{
    patientId?: string;
  }>;
}

const ChatPageContent = async ({ searchParams }: ChatPageProps) => {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  let patientId = params.patientId;

  // If no patientId is provided but user is a patient, use their own ID
  if (!patientId && session.user.userType === "PATIENT") {
    patientId = session.user.id;
  }

  // Check for patient ID (only required for non-patients or if patient ID is still missing)
  if (!patientId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-red-600">Ошибка</h2>
          <p className="text-gray-600 mb-4">
            Не указан ID пациента. Пожалуйста, перейдите в профиль пациента для
            доступа к чату.
          </p>
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Перейти к пациентам
          </Link>
        </Card>
      </div>
    );
  }

  // For patients, they can only chat about themselves
  const effectivePatientId =
    session.user.userType === "PATIENT" ? session.user.id : patientId;

  // Transform session user data into the format expected by the chat
  const getUserRole = (userType: string): "DOCTOR" | "NURSE" | "PATIENT" => {
    if (
      userType === "DISTRICT_DOCTOR" ||
      userType === "SPECIALIST_DOCTOR" ||
      userType === "DOCTOR"
    ) {
      return "DOCTOR";
    }
    if (userType === "NURSE") {
      return "NURSE";
    }
    return "PATIENT";
  };

  const currentUser = {
    id: session.user.id,
    name: session.user.fullName,
    role: getUserRole(session.user.userType),
  };

  return (
    <DashboardLayout
      userType={session.user.userType as UserType}
      session={{ fullName: session.user.fullName, id: session.user.id }}
    >
      <div className="flex flex-col h-full">
        <h2 className="text-2xl font-bold text-center mb-6">
          Чат консультации с пациентом
        </h2>
        <div className="flex-1 w-full">
          <ChatWrapper
            patientId={effectivePatientId}
            currentUser={currentUser}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

const ChatPage = (props: ChatPageProps) => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <Card className="p-6">
            <p className="text-gray-600">Загрузка...</p>
          </Card>
        </div>
      }
    >
      <ChatPageContent {...props} />
    </Suspense>
  );
};

export default ChatPage;
