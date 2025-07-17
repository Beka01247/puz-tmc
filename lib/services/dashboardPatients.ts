import { DashboardPatient } from "@/app/api/patients/dashboard/route";

export async function fetchDashboardPatients(): Promise<DashboardPatient[]> {
  try {
    const response = await fetch("/api/patients/dashboard", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const patients: DashboardPatient[] = await response.json();
    return patients;
  } catch (error) {
    console.error("Error fetching dashboard patients:", error);
    throw error;
  }
}
