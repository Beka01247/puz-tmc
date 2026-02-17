"use client";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import { UserType } from "@/constants/userTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import MeasurementModal from "@/components/MeasurementModal";
import StatisticsModal from "@/components/StatisticsModal";
import FileUploadModal from "@/components/FileUploadModal";
import FilesViewModal from "@/components/FilesViewModal";
import ECGViewModal from "@/components/ECGViewModal";

interface MonitoringItem {
  id: string;
  title: string;
  unit: string;
  inputType: "single" | "double" | "text" | "file" | "boolean";
  defaultValue: string;
  isPUZ?: boolean;
  puzConditions?: ("АГ" | "СД" | "ХСН")[];
}

interface Measurement {
  id: string;
  type: string;
  value1: string;
  value2: string | null;
  createdAt: string;
}

interface Alert {
  id: string;
  patientId: string;
  measurementType: string;
  alertStatus: "NORMAL" | "WARNING" | "CRITICAL";
  message: string;
  createdAt: string;
}

interface Session {
  user: {
    fullName: string;
    userType: string;
    id?: string;
    iin: string;
  };
}

interface MonitoringPageProps {
  session: Session;
}

export const monitoringItems: MonitoringItem[] = [
  {
    id: "blood-pressure",
    title: "Артериальное давление",
    unit: "",
    inputType: "double",
    defaultValue: "0/0",
  },
  {
    id: "pulse",
    title: "Пульс",
    unit: "уд/мин",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "temperature",
    title: "Температура",
    unit: "°C",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "glucose",
    title: "Глюкоза",
    unit: "ммоль",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "oximeter",
    title: "Оксигинация крови",
    unit: "%",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "spirometer",
    title: "Спирография",
    unit: "мл",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "cholesterol",
    title: "Холестерин",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "hemoglobin",
    title: "Гемоглобин",
    unit: "г/л",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "triglycerides",
    title: "Триглицериды",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "weight",
    title: "Вес",
    unit: "кг",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "height",
    title: "Рост",
    unit: "см",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "ultrasound",
    title: "УЗИ",
    unit: "",
    inputType: "file",
    defaultValue: "Нет данных",
  },
  {
    id: "xray",
    title: "Рентген",
    unit: "",
    inputType: "file",
    defaultValue: "Нет данных",
  },
  {
    id: "inr",
    title: "МНО",
    unit: "",
    inputType: "single",
    defaultValue: "0",
  },
  {
    id: "ecg",
    title: "ЭКГ",
    unit: "",
    inputType: "file",
    defaultValue: "ЭКГ",
  },
  {
    id: "bmi",
    title: "Индекс массы тела (ИМТ)",
    unit: "",
    inputType: "single",
    defaultValue: "0",
  },
  // PUZ-specific measurements
  {
    id: "creatinine",
    title: "КПД (Креатинин)",
    unit: "мкмоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["АГ", "СД", "ХСН"],
  },
  {
    id: "ldl-cholesterol",
    title: "ЛПНП (Холестерин ЛПНП)",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["АГ", "СД", "ХСН"],
  },
  {
    id: "egfr",
    title: "рСКФ (Скорость клубочковой фильтрации)",
    unit: "мл/мин",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["АГ", "ХСН", "СД"],
  },
  {
    id: "total-cholesterol",
    title: "О.Х. (Общий холестерин)",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["АГ", "ХСН"],
  },
  {
    id: "sodium",
    title: "Натрий",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["ХСН"],
  },
  {
    id: "potassium",
    title: "Калий",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["ХСН"],
  },
  {
    id: "probnp",
    title: "proBNP",
    unit: "пг/мл",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["ХСН"],
  },
  {
    id: "ejection-fraction",
    title: "ФВ (Фракция выброса)",
    unit: "%",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["ХСН"],
  },
  {
    id: "echocardiography",
    title: "Эхокардиография",
    unit: "",
    inputType: "file",
    defaultValue: "Нет данных",
    isPUZ: true,
    puzConditions: ["ХСН"],
  },
  {
    id: "glucose",
    title: "Глюкоза",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["СД"],
  },
  {
    id: "hba1c",
    title: "САК (HbA1c - Гликированный гемоглобин)",
    unit: "%",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["СД", "ХСН"],
  },
  {
    id: "urine-microalbumin",
    title: "Микроальбумин в моче",
    unit: "мг/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["АГ", "СД", "ХСН"],
  },
  {
    id: "urine-creatinine",
    title: "Креатинин в моче",
    unit: "ммоль/л",
    inputType: "single",
    defaultValue: "0",
    isPUZ: true,
    puzConditions: ["АГ", "СД", "ХСН"],
  },
  {
    id: "foot-exam",
    title: "Осмотр стоп",
    unit: "",
    inputType: "boolean",
    defaultValue: "Нет",
    isPUZ: true,
    puzConditions: ["СД"],
  },
  {
    id: "eye-exam",
    title: "Осмотр глаз",
    unit: "",
    inputType: "boolean",
    defaultValue: "Нет",
    isPUZ: true,
    puzConditions: ["СД"],
  },
  {
    id: "smoking",
    title: "Курение",
    unit: "",
    inputType: "boolean",
    defaultValue: "Нет",
    isPUZ: true,
    puzConditions: ["АГ", "СД", "ХСН"],
  },
];

const MonitoringPage = ({ session }: MonitoringPageProps) => {
  const [selectedItem, setSelectedItem] = useState<MonitoringItem | null>(null);
  const [selectedStatsItem, setSelectedStatsItem] =
    useState<MonitoringItem | null>(null);
  const [selectedFileUploadItem, setSelectedFileUploadItem] =
    useState<MonitoringItem | null>(null);
  const [selectedFilesViewItem, setSelectedFilesViewItem] =
    useState<MonitoringItem | null>(null);
  const [selectedECGViewItem, setSelectedECGViewItem] =
    useState<MonitoringItem | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPUZPatient, setIsPUZPatient] = useState(false);
  const [patientCondition, setPatientCondition] = useState<
    "АГ" | "СД" | "ХСН" | null
  >(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch measurements
        const measurementsResponse = await fetch("/api/measurements");
        if (!measurementsResponse.ok) {
          throw new Error("Не удалось загрузить измерения");
        }
        const measurementsData = await measurementsResponse.json();
        setMeasurements(measurementsData);

        // Fetch alerts for patient
        const alertsResponse = await fetch(
          `/api/patient-alerts?patientId=${session.user.id}`
        );
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts(alertsData);
        }

        // Check if patient has PUZ risk group (any risk group with condition АГ/ХСН/СД)
        const riskGroupsResponse = await fetch(
          `/api/patients/${session.user.id}/risk-groups`
        );
        if (riskGroupsResponse.ok) {
          const riskGroupsData = await riskGroupsResponse.json();
          console.log("🔍 Risk Groups Data:", riskGroupsData);
          // Find the first risk group with a condition
          const puzRiskGroup = riskGroupsData.find(
            (rg: { condition?: string }) =>
              rg.condition && ["АГ", "ХСН", "СД"].includes(rg.condition)
          );
          console.log("🎯 PUZ Risk Group:", puzRiskGroup);
          if (puzRiskGroup) {
            setIsPUZPatient(true);
            setPatientCondition(puzRiskGroup.condition as "АГ" | "СД" | "ХСН");
            console.log("✅ Patient Condition set to:", puzRiskGroup.condition);
          } else {
            setIsPUZPatient(false);
            setPatientCondition(null);
            console.log("❌ No PUZ condition found");
          }
        } else {
          setIsPUZPatient(false);
          setPatientCondition(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session.user.id]);

  // Sort monitoringItems based on latest measurement createdAt
  const sortedMonitoringItems = useMemo(() => {
    return [...monitoringItems]
      .filter((item) => !item.isPUZ)
      .sort((a, b) => {
        const measurementA = measurements.find((m) => m.type === a.id);
        const measurementB = measurements.find((m) => m.type === b.id);

        const dateA = measurementA
          ? new Date(measurementA.createdAt).getTime()
          : 0;
        const dateB = measurementB
          ? new Date(measurementB.createdAt).getTime()
          : 0;

        return dateB - dateA; // Newest first
      });
  }, [measurements]);

  // Sort PUZ items separately - filter by patient's condition
  const sortedPUZItems = useMemo(() => {
    if (!patientCondition) {
      console.log("⚠️ No patient condition set");
      return [];
    }

    console.log("🔍 Filtering PUZ items for condition:", patientCondition);
    const puzItems = [...monitoringItems].filter((item) => {
      const matches =
        item.isPUZ && item.puzConditions?.includes(patientCondition);
      if (item.isPUZ) {
        console.log(
          `  - ${item.title}: isPUZ=${item.isPUZ}, puzConditions=${item.puzConditions?.join(",")}, matches=${matches}`
        );
      }
      return matches;
    });
    console.log("✅ Filtered PUZ Items count:", puzItems.length);

    return puzItems.sort((a, b) => {
      const measurementA = measurements.find((m) => m.type === a.id);
      const measurementB = measurements.find((m) => m.type === b.id);

      const dateA = measurementA
        ? new Date(measurementA.createdAt).getTime()
        : 0;
      const dateB = measurementB
        ? new Date(measurementB.createdAt).getTime()
        : 0;

      return dateB - dateA; // Newest first
    });
  }, [measurements, patientCondition]);

  const handleAddMeasurement = (item: MonitoringItem) => {
    if (item.id === "ecg" || item.id === "bmi") {
      // ECG and BMI don't have add functionality
      return;
    } else if (item.inputType === "file") {
      setSelectedFileUploadItem(item);
    } else {
      setSelectedItem(item);
    }
  };

  const handleStatsClick = (item: MonitoringItem) => {
    if (item.id === "ecg") {
      setSelectedECGViewItem(item);
    } else if (item.inputType === "file") {
      setSelectedFilesViewItem(item);
    } else {
      setSelectedStatsItem(item);
    }
  };

  const handleModalClose = () => {
    setSelectedItem(null);
  };

  const handleStatsModalClose = () => {
    setSelectedStatsItem(null);
  };

  const handleFileUploadModalClose = () => {
    setSelectedFileUploadItem(null);
  };

  const handleFilesViewModalClose = () => {
    setSelectedFilesViewItem(null);
  };

  const handleECGViewModalClose = () => {
    setSelectedECGViewItem(null);
  };

  const handleFileUploadComplete = () => {
    // Refresh data if needed
    // For file uploads, we don't need to refresh measurements
    // but we might want to update file counts in the future
  };

  const handleModalSubmit = async (data: {
    value1: string;
    value2?: string;
  }) => {
    if (!selectedItem) return;

    try {
      const response = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedItem.id,
          value1: data.value1,
          value2: data.value2,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить измерение");
      }

      // Refresh measurements after successful POST
      const updatedResponse = await fetch("/api/measurements");
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setMeasurements(updatedData);
      }

      setSelectedItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLatestMeasurement = (itemId: string) => {
    // For file-based items, we don't use measurements, they use files
    if (
      itemId === "ultrasound" ||
      itemId === "xray" ||
      itemId === "echocardiography"
    ) {
      return {
        value: "Файлы",
        date: null,
      };
    }

    // Auto-calculate BMI from weight and height
    if (itemId === "bmi") {
      const weight = measurements
        .filter((m) => m.type === "weight")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      const height = measurements
        .filter((m) => m.type === "height")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

      if (weight && height) {
        const w = parseFloat(weight.value1);
        const h = parseFloat(height.value1) / 100; // convert cm to m
        if (w > 0 && h > 0) {
          const bmi = (w / (h * h)).toFixed(1);
          return {
            value: bmi,
            date: weight.createdAt,
          };
        }
      }
      return {
        value: "0",
        date: null,
      };
    }

    // Find the latest measurement for this type by sorting by createdAt desc
    const measurement = measurements
      .filter((m) => m.type === itemId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

    if (!measurement) {
      return {
        value: monitoringItems.find((i) => i.id === itemId)?.defaultValue,
        date: null,
      };
    }

    // For boolean types, show Да/Нет
    const item = monitoringItems.find((i) => i.id === itemId);
    if (item?.inputType === "boolean") {
      return {
        value: measurement.value1 === "Да" ? "✓ Да" : "✗ Нет",
        date: measurement.createdAt,
      };
    }

    return {
      value:
        measurement.type === "blood-pressure" && measurement.value2
          ? `${measurement.value1}/${measurement.value2}`
          : measurement.value1,
      date: measurement.createdAt,
    };
  };

  const hasActiveAlert = (itemId: string) => {
    return alerts.some(
      (alert) =>
        alert.measurementType === itemId && alert.alertStatus === "CRITICAL"
    );
  };

  return (
    <DashboardLayout
      userType={session.user.userType as UserType}
      session={{
        fullName: session.user.fullName,
      }}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Мониторинг состояния</h2>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedMonitoringItems.map((item) => {
                const { value, date } = getLatestMeasurement(item.id);
                const isAlert = hasActiveAlert(item.id);
                return (
                  <Card
                    key={item.id}
                    className={isAlert ? "border-red-500 bg-red-50" : ""}
                  >
                    <CardHeader>
                      <CardTitle className={isAlert ? "text-red-700" : ""}>
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${isAlert ? "text-red-700" : ""}`}
                      >
                        {value} {item.unit}
                      </div>
                      <p className="text-sm text-gray-400">
                        {item.id === "ecg"
                          ? "Данные ЭКГ из внешней системы"
                          : item.id === "bmi"
                            ? "Рассчитывается автоматически из роста и веса"
                            : item.inputType === "file"
                              ? "Нажмите '+' для загрузки файла"
                              : item.inputType === "boolean"
                                ? `Последнее обновление: ${date ? formatDate(date) : "Нет данных"}`
                                : `Последнее измерение: ${date ? formatDate(date) : "Нет данных"}`}
                      </p>
                      {item.id !== "ecg" && item.id !== "bmi" && (
                        <Button
                          className="mt-4 hover:bg-blue-400 bg-blue-200"
                          variant="outline"
                          onClick={() => handleAddMeasurement(item)}
                        >
                          +
                        </Button>
                      )}
                      <Button
                        className={`mt-4 ${item.id !== "ecg" ? "ml-4" : ""} hover:bg-blue-400`}
                        variant="outline"
                        onClick={() => handleStatsClick(item)}
                      >
                        {item.inputType === "file" ? "Посмотреть" : "График"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* PUZ Section */}
            {isPUZPatient && sortedPUZItems.length > 0 && (
              <Card className="mt-8 border-2 border-blue-300">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-xl text-blue-700">
                    ПУЗ (Пациенты под диспансерным наблюдением)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedPUZItems.map((item) => {
                      const { value, date } = getLatestMeasurement(item.id);
                      const isAlert = hasActiveAlert(item.id);
                      return (
                        <Card
                          key={item.id}
                          className={
                            isAlert
                              ? "border-red-500 bg-red-50"
                              : "border-blue-200"
                          }
                        >
                          <CardHeader>
                            <CardTitle
                              className={
                                isAlert ? "text-red-700" : "text-blue-700"
                              }
                            >
                              {item.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div
                              className={`text-2xl font-bold ${isAlert ? "text-red-700" : ""}`}
                            >
                              {value} {item.unit}
                            </div>
                            <p className="text-sm text-gray-400">
                              {item.id === "bmi"
                                ? "Рассчитывается автоматически из роста и веса"
                                : item.inputType === "file"
                                  ? "Нажмите '+' для загрузки файла"
                                  : item.inputType === "boolean"
                                    ? `Последнее обновление: ${date ? formatDate(date) : "Нет данных"}`
                                    : `Последнее измерение: ${date ? formatDate(date) : "Нет данных"}`}
                            </p>
                            {item.id !== "bmi" && (
                              <Button
                                className="mt-4 hover:bg-blue-400 bg-blue-200"
                                variant="outline"
                                onClick={() => handleAddMeasurement(item)}
                              >
                                +
                              </Button>
                            )}
                            {item.inputType !== "boolean" && (
                              <Button
                                className={`mt-4 ${item.id !== "bmi" ? "ml-4" : ""} hover:bg-blue-400`}
                                variant="outline"
                                onClick={() => handleStatsClick(item)}
                              >
                                {item.inputType === "file"
                                  ? "Посмотреть"
                                  : "График"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {selectedItem && selectedItem.inputType !== "file" && (
          <MeasurementModal
            item={{
              ...selectedItem,
              inputType: selectedItem.inputType as
                | "single"
                | "double"
                | "text"
                | "boolean",
            }}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
          />
        )}
        {selectedStatsItem &&
          selectedStatsItem.inputType !== "file" &&
          selectedStatsItem.inputType !== "boolean" && (
            <StatisticsModal
              item={{
                ...selectedStatsItem,
                inputType: selectedStatsItem.inputType as
                  | "single"
                  | "double"
                  | "text",
              }}
              measurements={measurements.filter(
                (m) => m.type === selectedStatsItem.id
              )}
              patientId={session.user.id || ""}
              onClose={handleStatsModalClose}
            />
          )}
        {selectedFileUploadItem && (
          <FileUploadModal
            title={selectedFileUploadItem.title}
            onClose={handleFileUploadModalClose}
            onSubmit={handleFileUploadComplete}
            patientId={session.user.id}
          />
        )}
        {selectedFilesViewItem && (
          <FilesViewModal
            title={selectedFilesViewItem.title}
            onClose={handleFilesViewModalClose}
            patientId={session.user.id}
          />
        )}
        {selectedECGViewItem && (
          <ECGViewModal
            onClose={handleECGViewModalClose}
            patientIIN={session.user.iin}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MonitoringPage;
