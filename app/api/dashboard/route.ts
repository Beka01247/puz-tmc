import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserType } from "@/constants/userTypes";
import { fetchUserInfo } from "@/lib/services/userService";
import { fetchMedicalActivities } from "@/lib/services/medicalActivityService";
import { fetchPatientTreatments } from "@/lib/services/treatmentService";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userType = session.user.userType as UserType;
    const userInfo = await fetchUserInfo(session.user.id);

    if (!userInfo) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only fetch medical activities and treatments for patients
    const medicalActivities =
      userType === UserType.PATIENT
        ? await fetchMedicalActivities(session.user.id)
        : [];

    const patientTreatments =
      userType === UserType.PATIENT
        ? await fetchPatientTreatments(session.user.id)
        : [];

    return NextResponse.json({
      userInfo,
      medicalActivities,
      patientTreatments,
      userType,
      session: {
        fullName: session.user.fullName,
        id: session.user.id,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
