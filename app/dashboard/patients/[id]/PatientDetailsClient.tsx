"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import { ScreeningCard } from "./ScreeningCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateAgeFromIIN,
  getBirthDateFromIIN,
  formatAge,
} from "@/lib/utils/ageCalculator";
import { isDoctorRole, isMedicalProvider } from "@/lib/utils/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsultationsTab } from "./ConsultationsTab";
import { TreatmentsTab } from "./TreatmentsTab";
import { RecommendationsTab } from "./RecommendationsTab";
import { FilesTab } from "./FilesTab";
import { MonitoringTab } from "./MonitoringTab";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EditDiagnosesModal } from "./EditDiagnosesModal";
import { EditRiskGroupsModal } from "./EditRiskGroupsModal";
import { EditSubdivisionModal } from "./EditSubdivisionModal";
import { toast } from "sonner";
import { PregnancyCard } from "./PregnancyCard";
import { FertileWomenRegisterCard } from "@/components/FertileWomenRegisterCard";
import { VaccinationsCard } from "@/components/VaccinationsCard";

interface Invitation {
  id: string;
  riskGroup: string;
  status: string;
  providerName: string | null;
  createdAt: string;
}

interface Diagnosis {
  id?: string;
  description: string;
}

interface RiskGroup {
  id?: string;
  name: string;
}

interface FertileWomenRegister {
  id: string;
  registrationDate: string | null;
  deregistrationDate: string | null;
  reasonDeregistered: string | null;
  pregnanciesCount: number | null;
  birthsCount: number | null;
  abortionsCount: number | null;
  stillbirthsCount: number | null;
  lastPregnancyDate: string | null;
  chronicDiseases: string | null;
  screeningStatus: string | null;
}

interface Patient {
  id: string;
  fullName: string;
  iin: string;
  email: string;
  telephone: string;
  city: string;
  organization: string;
  dateOfBirth: string | null;
  gender: "МУЖСКОЙ" | "ЖЕНСКИЙ" | null;
  subdivision: string | null;
  diagnoses: Diagnosis[];
  riskGroups: RiskGroup[];
}

interface Consultation {
  id: string;
  consultationDate: string;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  providerName: string | null;
}

interface TreatmentTime {
  id: string;
  time: string;
}

interface Treatment {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
  providerName: string | null;
  times: TreatmentTime[];
}

interface Recommendation {
  id: string;
  description: string;
  providerName: string | null;
  createdAt: string;
}

interface File {
  id: string;
  fileName: string;
  fileUrl: string;
  description?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
}

interface Measurement {
  id: string;
  type: string;
  value1: string;
  value2?: string | null;
  createdAt: string;
}

interface PatientScreening {
  id: string;
  screeningId: string;
  customScreeningName: string | null;
  scheduledDate: string;
  status: "INVITED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "REJECTED";
  result: string | null;
  notes: string | null;
  completedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
  screening: {
    id: string;
    name: string;
    description: string | null;
    testName: string | null;
  };
}

interface Vaccination {
  id: string;
  name: string | null;
  scheduledDate: string;
  administeredDate: string | null;
  status: "INVITED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "REJECTED";
  notes: string | null;
}

interface Reception {
  id: string;
  anamnesis: string;
  complaints: string;
  objectiveStatus: string;
  diagnosis: string;
  examinations: string;
  treatment: string;
  recommendations: string;
  createdAt: string;
}

interface InitialData {
  patient: Patient;
  consultations: Consultation[];
  treatments: Treatment[];
  recommendations: Recommendation[];
  files: File[];
  measurements: Measurement[];
  screenings: PatientScreening[];
  fertileWomenData: FertileWomenRegister | null;
  vaccinations: Vaccination[];
  receptions?: Reception[];
  invitations: Invitation[];
}

// Utility functions
const calculateAge = (iin: string): string => {
  return formatAge(calculateAgeFromIIN(iin));
};

const formatGender = (
  gender: "МУЖСКОЙ" | "ЖЕНСКИЙ" | "ДРУГОЙ" | null
): string => {
  switch (gender) {
    case "МУЖСКОЙ":
      return "М";
    case "ЖЕНСКИЙ":
      return "Ж";
    case "ДРУГОЙ":
      return "Другое";
    default:
      return "Не указан";
  }
};

export const PatientDetailsClient = ({
  initialData,
  userType,
  userName,
  patientId,
  userId,
}: {
  initialData: InitialData;
  userType: UserType;
  userName: string;
  patientId: string;
  userId: string;
}) => {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<
    | "consultations"
    | "treatments"
    | "recommendations"
    | "files"
    | "monitoring"
    | null
  >("monitoring");
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] =
    useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isRiskGroupModalOpen, setIsRiskGroupModalOpen] = useState(false);
  const [isSubdivisionModalOpen, setIsSubdivisionModalOpen] = useState(false);
  const [currentSubdivision, setCurrentSubdivision] = useState<string | null>(
    initialData.patient.subdivision
  );

  const handleGoBack = () => {
    router.back();
  };

  const handleSaveDiagnoses = (diagnoses: Diagnosis[]) => {
    initialData.patient.diagnoses = diagnoses;
    toast.success("Диагнозы обновлены");
  };

  const handleSaveRiskGroups = (riskGroups: RiskGroup[]) => {
    initialData.patient.riskGroups = riskGroups;
    toast.success("Группы риска обновлены");
  };

  const handleUpdateSubdivision = (newSubdivision: string | null) => {
    setCurrentSubdivision(newSubdivision);
    initialData.patient.subdivision = newSubdivision;
  };

  const isFemale = initialData.patient.gender === "ЖЕНСКИЙ";
  const isDoctor = isDoctorRole(userType.toString());
  const isProvider = isMedicalProvider(userType.toString());

  return (
    <DashboardLayout
      userType={userType}
      session={{ fullName: userName, id: userId }}
    >
      <TooltipProvider>
        <div className="space-y-4 md:space-y-6 p-2 md:p-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                  size="sm"
                  className="flex items-center gap-1 text-xs md:text-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Назад
                </Button>
              </div>
              <CardTitle className="text-center text-lg md:text-xl">
                Информация о пациенте
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 md:gap-y-2 md:pl-24">
                <div className="col-span-1 md:col-span-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>ФИО:</strong>
                    <span className="break-words">
                      {initialData.patient.fullName}
                    </span>
                  </div>
                  {isProvider && (
                    <Button
                      size="sm"
                      className="bg-yellow-200 hover:bg-yellow-400 text-yellow-900 border-black font-medium w-fit"
                      asChild
                    >
                      <Link href={`/chat?patientId=${patientId}`}>Чат</Link>
                    </Button>
                  )}
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>Дата рождения:</strong>{" "}
                  <span className="break-words">
                    {getBirthDateFromIIN(
                      initialData.patient.iin
                    )?.toLocaleDateString("ru-RU") || "Не указана"}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>Возраст:</strong>{" "}
                  {calculateAge(initialData.patient.iin)}
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>Пол:</strong>{" "}
                  {formatGender(initialData.patient.gender)}
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>ИИН:</strong>
                  <span className="break-all ml-1">
                    {initialData.patient.iin}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>Email:</strong>
                  <span className="break-all ml-1">
                    {initialData.patient.email}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>Телефон:</strong>
                  <span className="break-all ml-1">
                    {initialData.patient.telephone}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <strong>Город:</strong>
                  <span className="break-words ml-1">
                    {initialData.patient.city}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <strong>Организация:</strong>{" "}
                  <span className="break-words">
                    {initialData.patient.organization}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>Участок:</strong>{" "}
                    <span className="break-words">
                      {currentSubdivision || "Не указан"}
                    </span>
                  </div>
                  {isProvider && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => setIsSubdivisionModalOpen(true)}
                    >
                      Изменить
                    </Button>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>Группы:</strong>
                    {initialData.patient.riskGroups?.length ? (
                      <span className="break-words">
                        {initialData.patient.riskGroups
                          .map((rg) => rg.name)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-500">Нет групп риска</span>
                    )}
                  </div>
                  {isProvider && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => setIsRiskGroupModalOpen(true)}
                    >
                      Изменить
                    </Button>
                  )}
                </div>
                <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>Диагнозы:</strong>
                    {initialData.patient.diagnoses?.length ? (
                      <span className="break-words">
                        {initialData.patient.diagnoses
                          .map((d) => d.description)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-500">Нет диагнозов</span>
                    )}
                  </div>
                  {isProvider && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => setIsDiagnosisModalOpen(true)}
                    >
                      Изменить
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {isFemale && (
              <>
                <PregnancyCard
                  patientId={patientId}
                  isDoctor={isDoctor}
                  isProvider={isProvider}
                />
                {isProvider && (
                  <>
                    {initialData.fertileWomenData ? (
                      <FertileWomenRegisterCard
                        data={initialData.fertileWomenData}
                        patientId={patientId}
                        isEditable={isProvider}
                      />
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="text-sm md:text-base">
                              Регистр женщин фертильного возраста
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="py-4">
                            <p className="text-muted-foreground mb-4 text-center text-sm">
                              Пациент не состоит в регистре ЖФВ
                            </p>
                            <div className="flex justify-center">
                              {/* Direct button for adding to register */}
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(
                                      `/api/patients/${patientId}/fertile-women-register`,
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                      }
                                    );

                                    if (response.ok) {
                                      toast.success(
                                        "Пациент добавлен в регистр ЖФВ"
                                      );
                                      window.location.reload();
                                    } else {
                                      toast.error(
                                        "Не удалось добавить пациента в регистр"
                                      );
                                    }
                                  } catch {
                                    toast.error("Произошла ошибка");
                                  }
                                }}
                              >
                                Добавить в регистр ЖФВ
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <ScreeningCard
              patientId={patientId}
              screenings={initialData.screenings}
              invitations={initialData.invitations}
              patientGender={initialData.patient.gender}
              patientAge={parseInt(calculateAge(initialData.patient.iin), 10)}
              onScreeningUpdated={() => window.location.reload()}
              userType={userType}
            />
            <VaccinationsCard
              patientId={patientId}
              vaccinations={initialData.vaccinations}
              isDoctor={isProvider}
            />
          </div>

          <div className="flex justify-center px-4">
            <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
              <Button
                variant={selectedTab === "monitoring" ? "default" : "outline"}
                onClick={() => setSelectedTab("monitoring")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Мониторинг
              </Button>
              <Button
                variant={
                  selectedTab === "consultations" ? "default" : "outline"
                }
                onClick={() => setSelectedTab("consultations")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Приемы
              </Button>
              <Button
                variant={selectedTab === "treatments" ? "default" : "outline"}
                onClick={() => setSelectedTab("treatments")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Лечения
              </Button>
              <Button
                variant={
                  selectedTab === "recommendations" ? "default" : "outline"
                }
                onClick={() => setSelectedTab("recommendations")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Рекомендации
              </Button>
              <Button
                variant={selectedTab === "files" ? "default" : "outline"}
                onClick={() => setSelectedTab("files")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Файлы
              </Button>
            </div>
          </div>

          {selectedTab === "consultations" && (
            <ConsultationsTab
              receptions={initialData.receptions}
              isProvider={isProvider}
              patientId={patientId}
            />
          )}
          {selectedTab === "treatments" && (
            <TreatmentsTab
              treatments={initialData.treatments}
              isProvider={isProvider}
              patientId={patientId}
            />
          )}
          {selectedTab === "recommendations" && (
            <RecommendationsTab
              recommendations={initialData.recommendations}
              isProvider={isProvider}
              patientId={patientId}
              isModalOpen={isRecommendationModalOpen}
              setIsModalOpen={setIsRecommendationModalOpen}
            />
          )}
          {selectedTab === "files" && <FilesTab files={initialData.files} />}
          {selectedTab === "monitoring" && (
            <MonitoringTab
              measurements={initialData.measurements}
              patientId={patientId}
              userType={userType.toString()}
              patientIIN={initialData.patient.iin}
            />
          )}

          <EditDiagnosesModal
            isOpen={isDiagnosisModalOpen}
            onClose={() => setIsDiagnosisModalOpen(false)}
            diagnoses={initialData.patient.diagnoses}
            patientId={patientId}
            onSave={handleSaveDiagnoses}
          />

          <EditRiskGroupsModal
            isOpen={isRiskGroupModalOpen}
            onClose={() => setIsRiskGroupModalOpen(false)}
            riskGroups={initialData.patient.riskGroups}
            patientId={patientId}
            onSave={handleSaveRiskGroups}
          />

          <EditSubdivisionModal
            isOpen={isSubdivisionModalOpen}
            onClose={() => setIsSubdivisionModalOpen(false)}
            patientId={patientId}
            currentSubdivision={currentSubdivision}
            onUpdate={handleUpdateSubdivision}
          />
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export const PatientDetailsPageWithErrorBoundary = (props: {
  initialData: InitialData;
  userType: UserType;
  userName: string;
  patientId: string;
  userId: string;
}) => (
  <ErrorBoundary>
    <PatientDetailsClient {...props} />
  </ErrorBoundary>
);
