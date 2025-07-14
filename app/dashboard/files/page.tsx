import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import FilesPageClient from "./FilesPageClient";

const FilesPage = async () => {
  const session = await auth();

  if (!session) {
    redirect("/sign-in");
  }

  const userType = session.user.userType as UserType;

  if (userType !== UserType.PATIENT) {
    redirect("/dashboard");
  }

  return (
    <DashboardLayout
      userType={userType}
      session={{
        fullName: session.user.fullName,
        id: session.user.id,
      }}
    >
      <FilesPageClient patientId={session.user.id} />
    </DashboardLayout>
  );
};

export default FilesPage;
