"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { signUpSchema, createPatientSchema } from "../validations";
import { db } from "@/db/drizzle";
import { users, userTypeEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UserType } from "@/constants/userTypes";
import { signIn } from "@/auth";

export type AuthCredentials = z.infer<typeof signUpSchema>;
export type CreatePatientData = z.infer<typeof createPatientSchema>;

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">
) => {
  const { email, password } = params;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    // If signIn doesn't throw an error, it was successful
    return { success: true };
  } catch (error) {
    console.log("SignIn error:", error);

    // Handle specific authentication errors
    if (error && typeof error === "object" && "type" in error) {
      if (error.type === "CredentialsSignin") {
        return {
          success: false,
          error: "Неверный email или пароль",
        };
      }
    }

    return {
      success: false,
      error: "Ошибка входа в систему",
    };
  }
};

export async function signUp(params: AuthCredentials) {
  try {
    // Validate the input data
    const validatedData = signUpSchema.parse(params);

    console.log("Attempting to sign up user:", {
      email: validatedData.email,
      iin: validatedData.iin,
      userType: validatedData.userType,
    });

    // Check if user already exists (by email or IIN)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email));

    if (existingUserByEmail.length > 0) {
      console.log("User with email already exists:", validatedData.email);
      return {
        success: false,
        error: "Пользователь с таким email уже существует",
      };
    }

    const existingUserByIIN = await db
      .select()
      .from(users)
      .where(eq(users.iin, validatedData.iin));

    if (existingUserByIIN.length > 0) {
      console.log("User with IIN already exists:", validatedData.iin);
      return {
        success: false,
        error: "Пользователь с таким ИИН уже существует",
      };
    }

    // Hash the password
    const hashedPassword = await hash(validatedData.password, 10);

    // Map frontend user types to database user types
    let dbUserType: (typeof userTypeEnum.enumValues)[number] = "PATIENT";
    let doctorType: "GENERAL" | "SPECIALIST" | null = null;

    if (validatedData.userType === UserType.PATIENT) {
      dbUserType = "PATIENT";
    } else if (validatedData.userType === UserType.NURSE) {
      dbUserType = "NURSE";
    } else if (validatedData.userType === UserType.DISTRICT_DOCTOR) {
      dbUserType = "DOCTOR";
      doctorType = "GENERAL";
    } else if (validatedData.userType === UserType.SPECIALIST_DOCTOR) {
      dbUserType = "DOCTOR";
      doctorType = "SPECIALIST";
    } else if (validatedData.userType === UserType.REGIONAL_ADMIN) {
      dbUserType = "REGIONAL_ADMIN";
    } else if (validatedData.userType === UserType.CITY_ADMIN) {
      dbUserType = "CITY_ADMIN";
    } else if (validatedData.userType === UserType.DISTRICT_ADMIN) {
      dbUserType = "DISTRICT_ADMIN";
    }

    // Create the user
    await db.insert(users).values({
      fullName: validatedData.fullName,
      email: validatedData.email,
      password: hashedPassword,
      region: validatedData.region,
      city: validatedData.city,
      district: validatedData.district,
      settlement: validatedData.settlement,
      village: validatedData.village,
      organization: validatedData.organization || "Администрация", // Provide default for admin users
      userType: dbUserType,
      doctorType: doctorType,
      gender: validatedData.gender,
      department: validatedData.department,
      subdivision: validatedData.subdivision,
      specialization: validatedData.specialization,
      avatar: validatedData.avatar,
      iin: validatedData.iin,
      telephone: validatedData.telephone,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Sign up error:", error);

    if (error instanceof z.ZodError) {
      console.log("Validation errors:", error.errors);
      return {
        success: false,
        error: "Ошибка валидации данных",
      };
    }

    // Check if it's a database constraint error
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "23505") {
        // PostgreSQL unique constraint violation
        return {
          success: false,
          error: "Пользователь с такими данными уже существует",
        };
      }
    }

    return {
      success: false,
      error: "Произошла ошибка при регистрации",
    };
  }
}

export async function createPatient(
  params: CreatePatientData,
  creatorInfo: {
    region?: string;
    city: string;
    district?: string;
    settlement?: string;
    village?: string;
    organization: string;
  }
) {
  try {
    // Validate the input data
    const validatedData = createPatientSchema.parse(params);

    console.log("Attempting to create patient:", {
      email: validatedData.email,
      iin: validatedData.iin,
      creator: creatorInfo,
    });

    // Check if user already exists (by email or IIN)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email));

    if (existingUserByEmail.length > 0) {
      console.log("User with email already exists:", validatedData.email);
      return {
        success: false,
        error: "Пользователь с таким email уже существует",
      };
    }

    const existingUserByIIN = await db
      .select()
      .from(users)
      .where(eq(users.iin, validatedData.iin));

    if (existingUserByIIN.length > 0) {
      console.log("User with IIN already exists:", validatedData.iin);
      return {
        success: false,
        error: "Пользователь с таким ИИН уже существует",
      };
    }

    // Hash the password
    const hashedPassword = await hash(validatedData.password, 10);

    // Create the patient with creator's location information
    const [newUser] = await db
      .insert(users)
      .values({
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: hashedPassword,
        region: creatorInfo.region,
        city: creatorInfo.city,
        district: creatorInfo.district,
        settlement: creatorInfo.settlement,
        village: creatorInfo.village,
        organization: creatorInfo.organization,
        userType: "PATIENT",
        doctorType: null,
        gender: validatedData.gender,
        iin: validatedData.iin,
        telephone: validatedData.telephone,
      })
      .returning();

    return {
      success: true,
      patient: newUser,
    };
  } catch (error) {
    console.error("Create patient error:", error);

    if (error instanceof z.ZodError) {
      console.log("Validation errors:", error.errors);
      return {
        success: false,
        error: "Ошибка валидации данных",
      };
    }

    // Check if it's a database constraint error
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "23505") {
        // PostgreSQL unique constraint violation
        return {
          success: false,
          error: "Пользователь с такими данными уже существует",
        };
      }
    }

    return {
      success: false,
      error: "Произошла ошибка при создании пациента",
    };
  }
}
