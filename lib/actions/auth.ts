"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { signUpSchema } from "../validations";
import { db } from "@/db/drizzle";
import { riskGroups, users, userTypeEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UserType } from "@/constants/userTypes";
import { signIn } from "@/auth";

export type AuthCredentials = z.infer<typeof signUpSchema>;

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
    }

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: hashedPassword,
        city: validatedData.city,
        organization: validatedData.organization,
        userType: dbUserType,
        doctorType: doctorType,
        gender: validatedData.gender,
        department: validatedData.department,
        subdivision: validatedData.subdivision,
        district: validatedData.district,
        specialization: validatedData.specialization,
        avatar: validatedData.avatar,
        iin: validatedData.iin,
        telephone: validatedData.telephone,
      })
      .returning();

    if (dbUserType === "PATIENT") {
      await db.insert(riskGroups).values({
        userId: newUser.id,
        name: "Вакцинация",
      });
    }

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
