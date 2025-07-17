import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

const DashboardPage = async () => {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/sign-in");
  }

  return <DashboardClient />;
};

export default DashboardPage;
