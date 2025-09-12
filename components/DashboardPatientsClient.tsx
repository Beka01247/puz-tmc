"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { DashboardPatient } from "@/app/api/patients/dashboard/route";
import CreatePatientModal from "./CreatePatientModal";
import CallNotifications from "./CallNotifications";

interface UserInfo {
  id: string;
  fullName: string;
  region?: string;
  city: string;
  district?: string;
  settlement?: string;
  village?: string;
  organization: string;
}

const DashboardPatientsClient = () => {
  const [patients, setPatients] = useState<DashboardPatient[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch patients
        const patientsResponse = await fetch("/api/patients/dashboard");
        if (!patientsResponse.ok) {
          throw new Error(`HTTP error! status: ${patientsResponse.status}`);
        }
        const patientsData: DashboardPatient[] = await patientsResponse.json();
        setPatients(patientsData);

        // Fetch user info from dashboard endpoint
        const userResponse = await fetch("/api/dashboard");
        if (!userResponse.ok) {
          throw new Error(`HTTP error! status: ${userResponse.status}`);
        }
        const userData = await userResponse.json();
        setUserInfo({
          id: userData.session.id,
          fullName: userData.session.fullName,
          region: userData.userInfo.region,
          city: userData.userInfo.city,
          district: userData.userInfo.district,
          settlement: userData.userInfo.settlement,
          village: userData.userInfo.village,
          organization: userData.userInfo.organization,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Список пациентов</h2>
        </div>
        <div className="border rounded-lg p-8 text-center">Загрузка...</div>
      </div>
    );
  }

  if (error || !userInfo) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Список пациентов</h2>
        </div>
        <div className="border rounded-lg p-8 text-center text-red-500">
          {error || "Ошибка при загрузке данных пользователя"}
        </div>
      </div>
    );
  }

  const refreshPatients = async () => {
    try {
      const response = await fetch("/api/patients/dashboard");
      if (response.ok) {
        const data: DashboardPatient[] = await response.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Error refreshing patients:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Список пациентов</h2>
        <CreatePatientModal
          creatorInfo={{
            region: userInfo.region,
            city: userInfo.city,
            district: userInfo.district,
            settlement: userInfo.settlement,
            village: userInfo.village,
            organization: userInfo.organization,
          }}
          onPatientCreated={refreshPatients}
        />
      </div>

      {/* Call Notifications */}
      <CallNotifications currentUserId={userInfo.id} />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Статус</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Возраст</TableHead>
              <TableHead>Диагноз</TableHead>
              <TableHead>Критический показатель</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Нет пациентов в вашей организации и городе
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className={
                    patient.alertStatus === "CRITICAL" ? "bg-red-50" : ""
                  }
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          patient.alertStatus === "CRITICAL"
                            ? "bg-red-500"
                            : "bg-green-500"
                        }`}
                      />
                    </div>
                  </TableCell>
                  <TableCell
                    className={
                      patient.alertStatus === "CRITICAL" ? "font-medium" : ""
                    }
                  >
                    {patient.name}
                  </TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.diagnosis}</TableCell>
                  <TableCell>
                    {patient.alertMeasurements.length > 0 ? (
                      <div className="text-sm">
                        <span className="text-red-600 font-medium">
                          {patient.alertMeasurements.join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Нет</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/patients/${patient.id}`}>
                        Подробнее
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DashboardPatientsClient;
