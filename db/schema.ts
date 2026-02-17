import {
  varchar,
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  text,
  date,
  integer,
  boolean,
  decimal,
  time,
} from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["МУЖСКОЙ", "ЖЕНСКИЙ", "ЖЕНСКИЙ"]);
export const userTypeEnum = pgEnum("userType", [
  "DOCTOR",
  "NURSE",
  "PATIENT",
  "REGIONAL_ADMIN",
  "CITY_ADMIN",
  "DISTRICT_ADMIN",
]);
export const doctorTypeEnum = pgEnum("doctorType", ["GENERAL", "SPECIALIST"]);
export const measurementTypeEnum = pgEnum("measurementType", [
  "blood-pressure",
  "pulse",
  "temperature",
  "glucose",
  "oximeter",
  "spirometer",
  "cholesterol",
  "hemoglobin",
  "triglycerides",
  "weight",
  "height",
  "ultrasound",
  "xray",
  "inr",
  "ldl-cholesterol",
  "total-cholesterol",
  "egfr",
  "bmi",
  "creatinine",
  "hba1c",
  "foot-exam",
  "eye-exam",
  "smoking",
  "urine-microalbumin",
  "urine-creatinine",
  "sodium",
  "potassium",
  "probnp",
  "ejection-fraction",
  "echocardiography",
]);
export const puzConditionEnum = pgEnum("puzCondition", ["АГ", "ХСН", "СД"]);

export const alertStatusEnum = pgEnum("alertStatus", [
  "NORMAL",
  "WARNING",
  "CRITICAL",
]);

export const consultationStatusEnum = pgEnum("consultationStatus", [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
]);

export const screeningStatusEnum = pgEnum("screeningStatus", [
  "INVITED", // Doctor sent invitation
  "COMPLETED", // Patient marked as completed
  "CONFIRMED", // Doctor confirmed completion
  "CANCELLED", // Patient cancelled
  "REJECTED", // Doctor rejected completion
]);

export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  region: varchar("region", { length: 255 }), // Область
  city: varchar("city", { length: 255 }).notNull(),
  district: varchar("district", { length: 255 }), // Район
  settlement: varchar("settlement", { length: 255 }), // Поселок
  village: varchar("village", { length: 255 }), // Село
  organization: varchar("organization", { length: 255 }).notNull(), // Медицинское учреждение
  department: varchar("department", { length: 255 }), // Отделение
  subdivision: varchar("subdivision", { length: 255 }), // Подразделение
  userType: userTypeEnum("user_type").default("PATIENT"),
  doctorType: doctorTypeEnum("doctor_type"),
  specialization: varchar("specialization", { length: 255 }),
  avatar: varchar("avatar", { length: 255 }),
  iin: varchar("iin", { length: 12 }).unique().notNull(),
  telephone: varchar("telephone", { length: 20 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: genderEnum("gender"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const diagnoses = pgTable("diagnoses", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const riskGroups = pgTable("risk_groups", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  condition: puzConditionEnum("condition"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const measurements = pgTable("measurements", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: measurementTypeEnum("type").notNull(),
  value1: varchar("value1", { length: 255 }).notNull(),
  value2: varchar("value2", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const treatments = pgTable("treatments", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").references(() => users.id, {
    onDelete: "set null",
  }),
  medication: varchar("medication", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 255 }).notNull(),
  frequency: varchar("frequency", { length: 255 }).notNull(),
  duration: varchar("duration", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").references(() => users.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const consultations = pgTable("consultations", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consultationDate: timestamp("consultation_date", {
    withTimezone: true,
  }).notNull(),
  notes: text("notes"),
  status: consultationStatusEnum("status").default("SCHEDULED"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 2048 }).notNull(),
  description: text("description"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  riskGroup: varchar("risk_group", { length: 255 }).notNull(),
  status: screeningStatusEnum("status").default("INVITED"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const pregnancies = pgTable("pregnancies", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lmp: date("lmp").notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const screenings = pgTable("screenings", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  gender: genderEnum("gender"), // NULL if for men and woman
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  frequency: varchar("frequency", { length: 32 }),
  years: text("years"), // if user's age is in this list, screening is applicable
  testName: varchar("test_name", { length: 255 }),
  isRiskGroup: boolean("is_risk_group").default(false),
});

export const patientScreenings = pgTable("patient_screenings", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  screeningId: uuid("screening_id").references(() => screenings.id, {
    onDelete: "set null",
  }), // Can be null for custom
  customScreeningName: varchar("custom_screening_name", { length: 255 }), // Only used if screeningId is null
  providerId: uuid("provider_id").references(() => users.id, {
    onDelete: "set null",
  }),
  scheduledDate: date("scheduled_date").notNull(),
  status: screeningStatusEnum("status").default("INVITED"),
  result: text("result"),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedBy: uuid("confirmed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const fertileWomenRegister = pgTable("fertile_women_register", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  registrationDate: date("registration_date").notNull(), // дата постановки на учет
  deregistrationDate: date("deregistration_date"), // дата снятия с учета
  reasonDeregistered: varchar("reason_deregistered", { length: 255 }), // причина снятия с учета
  pregnanciesCount: integer("pregnancies_count"), // число беременностей
  birthsCount: integer("births_count"), // число родов
  abortionsCount: integer("abortions_count"), // число абортов
  stillbirthsCount: integer("stillbirths_count"), // число мертворождений
  lastPregnancyDate: date("last_pregnancy_date"), // дата последней беременности
  chronicDiseases: text("chronic_diseases"), // хронические заболевания
  screeningStatus: varchar("screening_status", { length: 64 }), // прошла ли скрининги (или их статус)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const patientVaccinations = pgTable("patient_vaccinations", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }), // for custom/manual entry
  scheduledDate: date("scheduled_date"), // date planned
  administeredDate: date("administered_date"), // date given
  status: screeningStatusEnum("status").default("INVITED"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const receptions = pgTable("receptions", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").references(() => users.id, {
    onDelete: "set null",
  }),
  anamnesis: text("anamnesis").notNull(),
  complaints: text("complaints").notNull(),
  objectiveStatus: text("objective_status").notNull(),
  diagnosis: text("diagnosis").notNull(),
  examinations: text("examinations").notNull(),
  treatment: text("treatment").notNull(),
  recommendations: text("recommendations").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const criticalValues = pgTable("critical_values", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  measurementType: measurementTypeEnum("measurement_type").notNull(),
  minValue: decimal("min_value", { precision: 10, scale: 2 }),
  maxValue: decimal("max_value", { precision: 10, scale: 2 }),
  minValue2: decimal("min_value2", { precision: 10, scale: 2 }), // for blood pressure etc
  maxValue2: decimal("max_value2", { precision: 10, scale: 2 }), // for blood pressure etc
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const patientAlerts = pgTable("patient_alerts", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  measurementId: uuid("measurement_id")
    .notNull()
    .references(() => measurements.id, { onDelete: "cascade" }),
  alertStatus: alertStatusEnum("alert_status").notNull(),
  criticalValueId: uuid("critical_value_id").references(
    () => criticalValues.id,
    { onDelete: "cascade" }
  ),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const treatmentTimes = pgTable("treatment_times", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  treatmentId: uuid("treatment_id")
    .notNull()
    .references(() => treatments.id, { onDelete: "cascade" }),
  timeOfDay: time("time_of_day").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const treatmentLogs = pgTable("treatment_logs", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  treatmentId: uuid("treatment_id")
    .notNull()
    .references(() => treatments.id, { onDelete: "cascade" }),
  treatmentTimeId: uuid("treatment_time_id")
    .notNull()
    .references(() => treatmentTimes.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  isTaken: boolean("is_taken").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const callNotifications = pgTable("call_notifications", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  callerId: uuid("caller_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channelName: varchar("channel_name", { length: 255 }).notNull(),
  isVideoCall: boolean("is_video_call").notNull(),
  isActive: boolean("is_active").default(true),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  participants: text("participants"), // JSON array of participant IDs
});
