import { db } from "@/db/drizzle";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { users, riskGroups, diagnoses } from "@/db/schema";

interface RiskGroup {
  id: string;
  name: string;
  createdAt: string;
}

interface Diagnosis {
  id: string;
  description: string;
  createdAt: string;
}

export interface UserInfo {
  id: string;
  fullName: string;
  email: string;
  region: string | null;
  city: string;
  district: string | null;
  settlement: string | null;
  village: string | null;
  organization: string;
  subdivision: string | null;
  userType:
    | "DOCTOR"
    | "NURSE"
    | "PATIENT"
    | "REGIONAL_ADMIN"
    | "CITY_ADMIN"
    | "DISTRICT_ADMIN";
  doctorType: "GENERAL" | "SPECIALIST" | null;
  department: string | null;
  specialization: string | null;
  avatar: string | null;
  iin: string;
  telephone: string;
  dateOfBirth: string | null;
  gender: "МУЖСКОЙ" | "ЖЕНСКИЙ" | "ДРУГОЙ" | null;
  createdAt: string;
  updatedAt: string;
  riskGroups: RiskGroup[];
  diagnoses: Diagnosis[];
}

export async function fetchUserInfo(userId: string): Promise<UserInfo | null> {
  try {
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        region: users.region,
        city: users.city,
        district: users.district,
        settlement: users.settlement,
        village: users.village,
        organization: users.organization,
        subdivision: users.subdivision,
        userType: users.userType,
        doctorType: users.doctorType,
        department: users.department,
        specialization: users.specialization,
        avatar: users.avatar,
        iin: users.iin,
        telephone: users.telephone,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    // Fetch risk groups for the user
    const userRiskGroups = await db
      .select({
        id: riskGroups.id,
        name: riskGroups.name,
        createdAt: riskGroups.createdAt,
      })
      .from(riskGroups)
      .where(eq(riskGroups.userId, userId));

    // Fetch diagnoses for the user
    const userDiagnoses = await db
      .select({
        id: diagnoses.id,
        description: diagnoses.description,
        createdAt: diagnoses.createdAt,
      })
      .from(diagnoses)
      .where(eq(diagnoses.userId, userId));

    return {
      ...user,
      userType: user.userType || "PATIENT",
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
      createdAt: format(new Date(user.createdAt!), "dd.MM.yyyy"),
      updatedAt: format(new Date(user.updatedAt!), "dd.MM.yyyy"),
      riskGroups: userRiskGroups.map((rg) => ({
        ...rg,
        createdAt: format(new Date(rg.createdAt!), "dd.MM.yyyy"),
      })),
      diagnoses: userDiagnoses.map((d) => ({
        ...d,
        createdAt: format(new Date(d.createdAt!), "dd.MM.yyyy"),
      })),
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}
