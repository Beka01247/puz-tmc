"use server";

import { db } from "@/db/drizzle";
import {
  patientScreenings,
  patientVaccinations,
  invitations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateActivityStatus(
  activityId: string,
  activityType: "INVITATION" | "SCREENING" | "VACCINATION",
  newStatus: "INVITED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "REJECTED"
) {
  try {
    switch (activityType) {
      case "INVITATION":
        await db
          .update(invitations)
          .set({ status: newStatus })
          .where(eq(invitations.id, activityId));
        break;
      case "SCREENING":
        await db
          .update(patientScreenings)
          .set({ status: newStatus })
          .where(eq(patientScreenings.id, activityId));
        break;
      case "VACCINATION":
        await db
          .update(patientVaccinations)
          .set({ status: newStatus })
          .where(eq(patientVaccinations.id, activityId));
        break;
      default:
        throw new Error("Invalid activity type");
    }
    // Revalidate the dashboard page to refresh the data
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating activity status:", error);
    return { success: false, error: "Failed to update status" };
  }
}
