import { z } from "zod";
import { UserType } from "@/constants/userTypes";

// Define gender enum to match database schema
export const Gender = z.enum(["МУЖСКОЙ", "ЖЕНСКИЙ"]);
export type Gender = z.infer<typeof Gender>;

export const signUpSchema = z
  .object({
    fullName: z.string().min(3, "ФИО должно содержать минимум 3 символа"),
    email: z
      .string()
      .email("Пожалуйста, введите действительный адрес электронной почты"),
    password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
    confirmPassword: z
      .string()
      .min(8, "Подтверждение пароля должно содержать минимум 8 символов"),
    region: z.string().optional(),
    city: z.string().min(2, "Город/область должен содержать минимум 2 символа"),
    district: z.string().optional(),
    settlement: z.string().optional(),
    village: z.string().optional(),
    organization: z.string().min(2, "Организация обязательна"),
    userType: z.nativeEnum(UserType),
    gender: Gender,
    department: z.string().optional(),
    subdivision: z.string().optional(),
    specialization: z.string().optional(),
    avatar: z.string().optional(),
    iin: z
      .string()
      .length(12, "ИИН должен содержать 12 цифр")
      .regex(/^\d+$/, "ИИН должен содержать только цифры"),
    telephone: z
      .string()
      .regex(
        /^\+7\d{10}$/,
        "Телефон должен начинаться с +7 и содержать 11 цифр"
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.userType === UserType.DISTRICT_DOCTOR) {
        return data.department && data.subdivision && data.district;
      }
      if (data.userType === UserType.SPECIALIST_DOCTOR) {
        return data.specialization && data.subdivision;
      }
      if (
        [
          UserType.REGIONAL_ADMIN,
          UserType.CITY_ADMIN,
          UserType.DISTRICT_ADMIN,
        ].includes(data.userType)
      ) {
        // Admin users need region/city/district based on their role
        if (data.userType === UserType.REGIONAL_ADMIN) {
          return data.region;
        }
        if (data.userType === UserType.CITY_ADMIN) {
          return data.city;
        }
        if (data.userType === UserType.DISTRICT_ADMIN) {
          return data.district;
        }
      }
      return true;
    },
    {
      message:
        "Пожалуйста, заполните все обязательные поля для выбранного типа пользователя",
      path: ["userType"],
    }
  );

export const signInSchema = z.object({
  email: z
    .string()
    .email("Пожалуйста, введите действительный адрес электронной почты"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
});

export const createPatientSchema = z
  .object({
    fullName: z.string().min(3, "ФИО должно содержать минимум 3 символа"),
    email: z
      .string()
      .email("Пожалуйста, введите действительный адрес электронной почты"),
    password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
    confirmPassword: z
      .string()
      .min(8, "Подтверждение пароля должно содержать минимум 8 символов"),
    gender: Gender,
    iin: z
      .string()
      .length(12, "ИИН должен содержать 12 цифр")
      .regex(/^\d+$/, "ИИН должен содержать только цифры"),
    telephone: z
      .string()
      .regex(
        /^\+7\d{10}$/,
        "Телефон должен начинаться с +7 и содержать 11 цифр"
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });
