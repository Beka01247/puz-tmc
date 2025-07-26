import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PatientDetailsClient } from "./PatientDetailsClient";
import { db } from "@/db/drizzle";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { UserType } from "@/constants/userTypes";
import {
  users,
  diagnoses,
  riskGroups,
  treatments,
  consultations,
  recommendations,
  files,
  measurements,
  screenings,
  patientScreenings,
  fertileWomenRegister,
  patientVaccinations,
  receptions,
  invitations,
  treatmentTimes,
} from "@/db/schema";

async function fetchPatientData(patientId: string) {
  const patientData = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      iin: users.iin,
      email: users.email,
      telephone: users.telephone,
      city: users.city,
      organization: users.organization,
      dateOfBirth: users.dateOfBirth,
      gender: users.gender,
    })
    .from(users)
    .where(eq(users.id, patientId))
    .then((data) => ({
      ...data[0],
      dateOfBirth: data[0].dateOfBirth
        ? format(new Date(data[0].dateOfBirth), "yyyy-MM-dd")
        : null,
    }));

  const receptionsData = await db
    .select({
      id: receptions.id,
      anamnesis: receptions.anamnesis,
      complaints: receptions.complaints,
      objectiveStatus: receptions.objectiveStatus,
      diagnosis: receptions.diagnosis,
      examinations: receptions.examinations,
      treatment: receptions.treatment,
      recommendations: receptions.recommendations,
      createdAt: receptions.createdAt,
    })
    .from(receptions)
    .where(eq(receptions.patientId, patientId))
    .then((data) => data || []);

  const diagnosesData = await db
    .select({
      id: diagnoses.id,
      description: diagnoses.description,
    })
    .from(diagnoses)
    .where(eq(diagnoses.userId, patientId))
    .then((data) => data || []);

  const riskGroupsData = await db
    .select({
      id: riskGroups.id,
      name: riskGroups.name,
    })
    .from(riskGroups)
    .where(eq(riskGroups.userId, patientId))
    .then((data) => data || []);

  const treatmentsData = await db
    .select({
      id: treatments.id,
      medication: treatments.medication,
      dosage: treatments.dosage,
      frequency: treatments.frequency,
      duration: treatments.duration,
      notes: treatments.notes,
      providerName: users.fullName,
    })
    .from(treatments)
    .leftJoin(users, eq(treatments.providerId, users.id))
    .where(eq(treatments.patientId, patientId))
    .then(async (data) => {
      // Fetch treatment times for each treatment
      const treatmentsWithTimes = await Promise.all(
        data.map(async (treatment) => {
          const times = await db
            .select({
              id: treatmentTimes.id,
              time: treatmentTimes.timeOfDay,
            })
            .from(treatmentTimes)
            .where(eq(treatmentTimes.treatmentId, treatment.id));

          return {
            ...treatment,
            times: times || [],
          };
        })
      );
      return treatmentsWithTimes;
    });

  const consultationsData = await db
    .select({
      id: consultations.id,
      consultationDate: consultations.consultationDate,
      notes: consultations.notes,
      status: consultations.status,
      providerName: users.fullName,
    })
    .from(consultations)
    .leftJoin(users, eq(consultations.providerId, users.id))
    .where(eq(consultations.patientId, patientId))
    .then((data) =>
      data
        .filter(
          (
            consultation
          ): consultation is typeof consultation & {
            status: NonNullable<typeof consultation.status>;
          } => consultation.status !== null
        )
        .map((consultation) => ({
          ...consultation,
          consultationDate: format(
            new Date(consultation.consultationDate),
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
        }))
    );

  const recommendationsData = await db
    .select({
      id: recommendations.id,
      description: recommendations.description,
      providerName: users.fullName,
      createdAt: recommendations.createdAt,
    })
    .from(recommendations)
    .leftJoin(users, eq(recommendations.providerId, users.id))
    .where(eq(recommendations.patientId, patientId))
    .then((data) =>
      data.map((recommendation) => ({
        ...recommendation,
        createdAt:
          recommendation.createdAt &&
          format(
            new Date(recommendation.createdAt),
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
      }))
    );

  const filesData = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileUrl: files.fileUrl,
      description: files.description,
      uploadedBy: users.fullName,
      createdAt: files.createdAt,
    })
    .from(files)
    .leftJoin(users, eq(files.uploadedBy, users.id))
    .where(eq(files.patientId, patientId))
    .then((data) =>
      data.map((file) => ({
        ...file,
        createdAt:
          file.createdAt &&
          format(new Date(file.createdAt), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      }))
    );

  const measurementsData = await db
    .select({
      id: measurements.id,
      type: measurements.type,
      value1: measurements.value1,
      value2: measurements.value2,
      createdAt: measurements.createdAt,
    })
    .from(measurements)
    .where(eq(measurements.userId, patientId))
    .orderBy(desc(measurements.createdAt))
    .then((data) =>
      data.map((measurement) => ({
        ...measurement,
        createdAt:
          measurement.createdAt &&
          format(new Date(measurement.createdAt), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      }))
    );

  const patientScreeningsData = await db
    .select({
      id: patientScreenings.id,
      screeningId: patientScreenings.screeningId,
      customScreeningName: patientScreenings.customScreeningName,
      scheduledDate: patientScreenings.scheduledDate,
      status: patientScreenings.status,
      result: patientScreenings.result,
      notes: patientScreenings.notes,
      completedAt: patientScreenings.completedAt,
      confirmedAt: patientScreenings.confirmedAt,
      confirmedBy: patientScreenings.confirmedBy,
      createdAt: patientScreenings.createdAt,
      screening: {
        id: screenings.id,
        name: screenings.name,
        description: screenings.description,
        testName: screenings.testName,
      },
    })
    .from(patientScreenings)
    .leftJoin(screenings, eq(patientScreenings.screeningId, screenings.id))
    .where(eq(patientScreenings.patientId, patientId))
    .then((data) =>
      data
        .filter(
          (
            screening
          ): screening is typeof screening & {
            screeningId: string;
            status: NonNullable<typeof screening.status>;
            screening: NonNullable<typeof screening.screening>;
          } =>
            screening.screeningId !== null &&
            screening.screening !== null &&
            screening.status !== null
        )
        .map((screening) => ({
          ...screening,
          scheduledDate: format(
            new Date(screening.scheduledDate),
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
          completedAt:
            screening.completedAt &&
            format(new Date(screening.completedAt), "yyyy-MM-dd'T'HH:mm:ssXXX"),
          confirmedAt:
            screening.confirmedAt &&
            format(new Date(screening.confirmedAt), "yyyy-MM-dd'T'HH:mm:ssXXX"),
          createdAt:
            screening.createdAt &&
            format(new Date(screening.createdAt), "yyyy-MM-dd'T'HH:mm:ssXXX"),
        }))
    );

  const fertileWomenData = await db
    .select({
      id: fertileWomenRegister.id,
      registrationDate: fertileWomenRegister.registrationDate,
      deregistrationDate: fertileWomenRegister.deregistrationDate,
      reasonDeregistered: fertileWomenRegister.reasonDeregistered,
      pregnanciesCount: fertileWomenRegister.pregnanciesCount,
      birthsCount: fertileWomenRegister.birthsCount,
      abortionsCount: fertileWomenRegister.abortionsCount,
      stillbirthsCount: fertileWomenRegister.stillbirthsCount,
      lastPregnancyDate: fertileWomenRegister.lastPregnancyDate,
      chronicDiseases: fertileWomenRegister.chronicDiseases,
      screeningStatus: fertileWomenRegister.screeningStatus,
    })
    .from(fertileWomenRegister)
    .where(eq(fertileWomenRegister.userId, patientId))
    .then((data) => {
      if (data.length === 0) return null;
      const record = data[0];
      return {
        ...record,
        registrationDate:
          record.registrationDate &&
          format(new Date(record.registrationDate), "yyyy-MM-dd"),
        deregistrationDate:
          record.deregistrationDate &&
          format(new Date(record.deregistrationDate), "yyyy-MM-dd"),
        lastPregnancyDate:
          record.lastPregnancyDate &&
          format(new Date(record.lastPregnancyDate), "yyyy-MM-dd"),
      };
    });

  const vaccinationsData = await db
    .select({
      id: patientVaccinations.id,
      name: patientVaccinations.name,
      scheduledDate: patientVaccinations.scheduledDate,
      administeredDate: patientVaccinations.administeredDate,
      status: patientVaccinations.status,
      notes: patientVaccinations.notes,
    })
    .from(patientVaccinations)
    .where(eq(patientVaccinations.patientId, patientId))
    .then((data) =>
      data
        .filter(
          (
            vaccination
          ): vaccination is typeof vaccination & {
            status: NonNullable<typeof vaccination.status>;
          } => vaccination.status !== null
        )
        .map((vaccination) => ({
          ...vaccination,
          scheduledDate: vaccination.scheduledDate
            ? format(
                new Date(vaccination.scheduledDate),
                "yyyy-MM-dd'T'HH:mm:ssXXX"
              )
            : null,
          administeredDate: vaccination.administeredDate
            ? format(
                new Date(vaccination.administeredDate),
                "yyyy-MM-dd'T'HH:mm:ssXXX"
              )
            : null,
        }))
    );

  // Add invitations fetching
  const invitationsData = await db
    .select({
      id: invitations.id,
      riskGroup: invitations.riskGroup,
      status: invitations.status,
      createdAt: invitations.createdAt,
      providerName: users.fullName,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.providerId, users.id))
    .where(eq(invitations.patientId, patientId))
    .then((data) =>
      data.map((inv) => ({
        ...inv,
        status: inv.status ?? "INVITED",
        createdAt: inv.createdAt
          ? format(new Date(inv.createdAt), "yyyy-MM-dd'T'HH:mm:ssXXX")
          : "",
      }))
    );

  return {
    patient: {
      ...patientData,
      diagnoses: diagnosesData,
      riskGroups: riskGroupsData,
    },
    treatments: treatmentsData,
    consultations: consultationsData,
    recommendations: recommendationsData,
    files: filesData,
    measurements: measurementsData,
    screenings: patientScreeningsData,
    fertileWomenData,
    vaccinations: vaccinationsData,
    receptions: receptionsData.map((reception) => ({
      ...reception,
      createdAt: reception.createdAt
        ? format(new Date(reception.createdAt), "yyyy-MM-dd'T'HH:mm:ssXXX")
        : "",
    })),
    invitations: invitationsData,
  };
}

interface Props {
  params: Promise<{ id: string }>;
}

const PatientDetailsPage = async ({ params }: Props) => {
  const resolvedParams = await params;
  const session = await auth();

  if (!session || !session.user) {
    redirect("/sign-in");
  }

  // Cast userType to the correct enum and handle string literals
  const userTypeString = session.user.userType as string;
  let userType: UserType;

  if (Object.values(UserType).includes(userTypeString as UserType)) {
    userType = userTypeString as UserType;
  } else {
    switch (userTypeString) {
      case "DOCTOR":
        userType = UserType.DISTRICT_DOCTOR;
        break;
      case "SPECIALIST_DOCTOR":
        userType = UserType.SPECIALIST_DOCTOR;
        break;
      case "NURSE":
        userType = UserType.NURSE;
        break;
      default:
        userType = UserType.PATIENT;
    }
  }

  const data = await fetchPatientData(resolvedParams.id);

  // Ensure all timestamps are non-null
  const typeSafeData = {
    ...data,
    recommendations: data.recommendations.map((rec) => ({
      ...rec,
      createdAt:
        rec.createdAt ?? format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    })),
    files: data.files.map((file) => ({
      ...file,
      createdAt:
        file.createdAt ?? format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    })),
    measurements: data.measurements.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    })),
    screenings: data.screenings.map((screening) => ({
      ...screening,
      createdAt:
        screening.createdAt ?? format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
    })),
    vaccinations: data.vaccinations.map((vaccination) => ({
      ...vaccination,
      scheduledDate:
        vaccination.scheduledDate ??
        format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      administeredDate: vaccination.administeredDate,
    })),
    receptions:
      data.receptions?.map((reception) => ({
        ...reception,
        createdAt:
          reception.createdAt ?? format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      })) || [],
  };

  return (
    <PatientDetailsClient
      initialData={typeSafeData}
      userType={userType}
      userName={session.user.fullName}
      patientId={resolvedParams.id}
      userId={session.user.id}
    />
  );
};

export default PatientDetailsPage;
