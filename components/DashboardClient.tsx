"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalActivityCard } from "@/components/MedicalActivityCard";
import { TreatmentCard } from "@/components/TreatmentCard";
import {
  formatGender,
  formatUserType,
  formatDoctorType,
} from "@/lib/utils/formatters";
import type { UserInfo } from "@/lib/services/userService";
import type { MedicalActivity } from "@/lib/services/medicalActivityService";
import type { Treatment } from "@/lib/services/treatmentService";

interface DashboardData {
  userInfo: UserInfo;
  medicalActivities: MedicalActivity[];
  patientTreatments: Treatment[];
  userType: UserType;
  session: {
    fullName: string;
    id: string;
  };
}

const DashboardClient = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">
          {error || "Ошибка загрузки данных пользователя"}
        </div>
      </div>
    );
  }

  const { userInfo, medicalActivities, patientTreatments, userType, session } =
    dashboardData;

  return (
    <DashboardLayout userType={userType} session={session}>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Мой профиль</h2>

        <Card className="bg-white text-black border-gray-600">
          <CardHeader>
            <CardTitle>Информация о пользователе</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="font-semibold">ФИО:</span> {userInfo.fullName}
            </p>
            <p>
              <span className="font-semibold">ИИН:</span> {userInfo.iin}
            </p>
            <p>
              <span className="font-semibold">Дата рождения:</span>{" "}
              {userInfo.dateOfBirth || "Не указана"}
            </p>
            <p>
              <span className="font-semibold">Пол:</span>{" "}
              {formatGender(userInfo.gender)}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {userInfo.email}
            </p>
            <p>
              <span className="font-semibold">Телефон:</span>{" "}
              {userInfo.telephone}
            </p>
            <p>
              <span className="font-semibold">Город:</span> {userInfo.city}
            </p>
            <p>
              <span className="font-semibold">Организация:</span>{" "}
              {userInfo.organization}
            </p>
            <p>
              <span className="font-semibold">Подразделение:</span>{" "}
              {userInfo.subdivision || "Не указано"}
            </p>
            <p>
              <span className="font-semibold">Район:</span>{" "}
              {userInfo.district || "Не указано"}
            </p>
            <p>
              <span className="font-semibold">Тип пользователя:</span>{" "}
              {formatUserType(userInfo.userType)}
            </p>
            {userInfo.userType === "DOCTOR" && (
              <>
                <p>
                  <span className="font-semibold">Тип врача:</span>{" "}
                  {formatDoctorType(userInfo.doctorType)}
                </p>
                <p>
                  <span className="font-semibold">Отделение:</span>{" "}
                  {userInfo.department || "Не указано"}
                </p>
                <p>
                  <span className="font-semibold">Специализация:</span>{" "}
                  {userInfo.specialization || "Не указано"}
                </p>
              </>
            )}

            {/* Risk Groups Section - Only for Patients */}
            {userInfo.userType === "PATIENT" && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="font-semibold mb-2">Группы:</p>
                {userInfo.riskGroups.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Группы риска не назначены
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userInfo.riskGroups.map((group) => (
                      <span
                        key={group.id}
                        className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {group.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Diagnoses Section - Only for Patients */}
            {userInfo.userType === "PATIENT" && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="font-semibold mb-2">Диагнозы:</p>
                {userInfo.diagnoses.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Диагнозы не установлены
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userInfo.diagnoses.map((diagnosis) => (
                      <div
                        key={diagnosis.id}
                        className="p-3 bg-gray-50 rounded-lg border"
                      >
                        <p className="text-sm font-medium">
                          {diagnosis.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Дата: {diagnosis.createdAt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {userInfo.userType === "PATIENT" && (
          <div className="space-y-6">
            {/* Treatments Section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Лечения</h3>
              {patientTreatments.length === 0 ? (
                <p className="text-gray-500">Нет активных лечений</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {patientTreatments.map((treatment) => (
                    <TreatmentCard
                      key={treatment.id}
                      treatment={treatment}
                      patientId={session.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Invitations Section */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Приглашения</h3>
              {medicalActivities.length === 0 ? (
                <p className="text-gray-500">Нет активных приглашений</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {medicalActivities.map((activity) => (
                    <MedicalActivityCard
                      key={activity.id}
                      activity={activity}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardClient;
