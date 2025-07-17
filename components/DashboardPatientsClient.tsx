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

const DashboardPatientsClient = () => {
  const [patients, setPatients] = useState<DashboardPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/patients/dashboard");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: DashboardPatient[] = await response.json();
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError("Ошибка при загрузке пациентов");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Список пациентов</h2>
          <Button>Добавить пациента</Button>
        </div>
        <div className="border rounded-lg p-8 text-center">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Список пациентов</h2>
          <Button>Добавить пациента</Button>
        </div>
        <div className="border rounded-lg p-8 text-center text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Список пациентов</h2>
        <Button>Добавить пациента</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Статус</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Возраст</TableHead>
              <TableHead>Диагноз</TableHead>
              <TableHead>Пределы</TableHead>
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
