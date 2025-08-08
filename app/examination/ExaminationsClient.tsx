"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  isInvited: boolean | undefined;
  completedScreenings?: string;
  completedVaccinations?: string;
  pregnancyWeek?: number;
}

interface ExaminationsClientProps {
  initialPatients: Patient[];
  userType: UserType;
  userName: string;
  organization: string;
  city: string;
  userId: string;
}

export const ExaminationsClient = ({
  initialPatients,
  userType,
  userName,
  organization,
  city,
  userId,
}: ExaminationsClientProps) => {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [age, setAge] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("Скрининг");
  const [patientCount, setPatientCount] = useState<number>(
    initialPatients.length
  );

  const riskGroups = [
    "Скрининг",
    "Вакцинация",
    "Беременные",
    "ЖФВ",
    "ДН",
    "ПУЗ",
  ];

  const fetchPatients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("organization", organization);
      params.append("city", city);
      params.append("riskGroup", activeTab);

      if (activeTab === "Скрининг" && age) {
        params.append("age", age);
      }

      const response = await fetch(`/api/examinations?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Не удалось загрузить пациентов");
      }
      const data = await response.json();
      const patientsWithInvitation = data.map((patient: Patient) => {
        return {
          ...patient,
          isInvited: !!patient.isInvited,
        };
      });
      setPatients(patientsWithInvitation);
      setPatientCount(data.length);
    } catch (error) {
      console.error("Ошибка при загрузке пациентов:", error);
      toast.error("Ошибка при загрузке пациентов");
    }
  }, [activeTab, age, city, organization]);

  useEffect(() => {
    // Fetch data for all tabs, including ЖФВ
    fetchPatients();
  }, [activeTab, age, fetchPatients]);

  const handleAgeFilterChange = () => {
    const ageValue = age ? parseInt(age) : undefined;
    if (
      ageValue !== undefined &&
      (isNaN(ageValue) || ageValue < 0 || ageValue > 120)
    ) {
      toast.error("Введите корректный возраст (0-120)");
      return;
    }
    fetchPatients();
  };

  const handleInvite = async (patientId: string) => {
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          riskGroup: activeTab,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка при создании приглашения");
      }

      toast.success("Приглашение отправлено");

      // Immediately update the local state to set isInvited to true for the invited patient
      setPatients((currentPatients) =>
        currentPatients.map((patient) =>
          patient.id === patientId ? { ...patient, isInvited: true } : patient
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось отправить приглашение";
      toast.error(message);
      console.error("Error sending invitation:", error);
    }
  };

  const renderPatientTable = () => {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>Возраст</TableHead>
              <TableHead>Диагноз</TableHead>
              {activeTab === "Скрининг" && (
                <TableHead>Пройденные скрининги</TableHead>
              )}
              {activeTab === "Вакцинация" && (
                <TableHead>Пройденные вакцинации</TableHead>
              )}
              {activeTab === "Беременные" && (
                <TableHead>Неделя беременности</TableHead>
              )}
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    ["Скрининг", "Вакцинация", "Беременные", "ЖФВ"].includes(
                      activeTab
                    )
                      ? 5
                      : activeTab === "ЖФВ"
                        ? 3
                        : 4
                  }
                  className="text-center"
                >
                  {activeTab === "ЖФВ"
                    ? "Нет пациентов в реестре ЖФВ"
                    : activeTab === "Скрининг"
                      ? "Нет пациентов для скрининга"
                      : activeTab === "Вакцинация"
                        ? "Нет пациентов для вакцинации"
                        : activeTab === "Беременные"
                          ? "Нет беременных пациентов"
                          : "Нет пациентов в группе риска"}
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => {
                return (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className="hover:underline"
                      >
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>{patient.diagnosis}</TableCell>
                    {activeTab === "Скрининг" && (
                      <TableCell>{patient.completedScreenings}</TableCell>
                    )}
                    {activeTab === "Вакцинация" && (
                      <TableCell>{patient.completedVaccinations}</TableCell>
                    )}
                    {activeTab === "Беременные" && (
                      <TableCell>{patient.pregnancyWeek} недель</TableCell>
                    )}
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/patients/${patient.id}`}>
                            Подробнее
                          </Link>
                        </Button>
                        {(activeTab === "Беременные" ||
                          activeTab === "ДН" ||
                          activeTab === "ЖФВ" ||
                          activeTab === "ПУЗ") && (
                          <Button
                            variant={
                              patient.isInvited ? "secondary" : "default"
                            }
                            size="sm"
                            onClick={() => handleInvite(patient.id)}
                            disabled={patient.isInvited}
                          >
                            {patient.isInvited ? "Приглашен(а)" : "Пригласить"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <DashboardLayout
      userType={userType}
      session={{ fullName: userName, id: userId }}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Обследования</h2>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            {riskGroups.map((group) => (
              <TabsTrigger key={group} value={group}>
                {group}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="Скрининг">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Возраст:</span>
                <Input
                  id="age"
                  type="number"
                  placeholder="0"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="0"
                  max="120"
                  className="w-24"
                />
                <Button onClick={handleAgeFilterChange}>Применить</Button>
              </div>
              <div className="whitespace-nowrap">
                Найдено пациентов: {patientCount}
              </div>
            </div>
            <div className="mt-4">{renderPatientTable()}</div>
          </TabsContent>
          {riskGroups.slice(1).map((group) => (
            <TabsContent key={group} value={group}>
              <div className="space-y-4">
                <div className="text-right">
                  Найдено пациентов: {patientCount}
                </div>
                {renderPatientTable()}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
