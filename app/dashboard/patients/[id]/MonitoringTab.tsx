"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MeasurementModal from "@/components/MeasurementModal";
import StatisticsModal from "@/components/StatisticsModal";
import CriticalValuesModal from "@/components/CriticalValuesModal";
import FileUploadModal from "@/components/FileUploadModal";
import FilesViewModal from "@/components/FilesViewModal";
import ECGViewModal from "@/components/ECGViewModal";
import { monitoringItems } from "@/components/MonitoringPage";
import { BluetoothIcon } from "@/components/ui/bluetooth-icon";

interface Measurement {
  id: string;
  type: string;
  value1: string;
  value2?: string | null;
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

interface MonitoringTabProps {
  measurements: Measurement[];
  patientId: string;
  userType: string;
  patientIIN?: string;
}

export const MonitoringTab = ({
  measurements,
  patientId,
  userType,
  patientIIN,
}: MonitoringTabProps) => {
  const [selectedItem, setSelectedItem] = useState<
    (typeof monitoringItems)[0] | null
  >(null);
  const [selectedStatsItem, setSelectedStatsItem] = useState<
    (typeof monitoringItems)[0] | null
  >(null);
  const [selectedFileUploadItem, setSelectedFileUploadItem] = useState<
    (typeof monitoringItems)[0] | null
  >(null);
  const [selectedFilesViewItem, setSelectedFilesViewItem] = useState<
    (typeof monitoringItems)[0] | null
  >(null);
  const [selectedECGViewItem, setSelectedECGViewItem] = useState<
    (typeof monitoringItems)[0] | null
  >(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentMeasurements, setCurrentMeasurements] =
    useState<Measurement[]>(measurements);
  const [isPUZPatient, setIsPUZPatient] = useState(false);
  const [patientCondition, setPatientCondition] = useState<
    "АГ" | "СД" | "ХСН" | null
  >(null);

  // Sync measurements when prop changes
  useEffect(() => {
    setCurrentMeasurements(measurements);
  }, [measurements]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(
          `/api/patient-alerts?patientId=${patientId}`
        );
        if (response.ok) {
          const alertsData = await response.json();
          setAlerts(alertsData);
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    fetchAlerts();
  }, [patientId]);

  useEffect(() => {
    const checkPUZStatus = async () => {
      try {
        const riskGroupsResponse = await fetch(
          `/api/patients/${patientId}/risk-groups`
        );
        if (riskGroupsResponse.ok) {
          const riskGroupsData = await riskGroupsResponse.json();
          const puzRiskGroup = riskGroupsData.find(
            (rg: { condition?: string }) =>
              rg.condition && ["АГ", "ХСН", "СД"].includes(rg.condition)
          );
          if (puzRiskGroup) {
            setIsPUZPatient(true);
            setPatientCondition(puzRiskGroup.condition as "АГ" | "СД" | "ХСН");
          } else {
            setIsPUZPatient(false);
            setPatientCondition(null);
          }
        } else {
          setIsPUZPatient(false);
          setPatientCondition(null);
        }
      } catch (error) {
        console.error("Error checking PUZ status:", error);
        setIsPUZPatient(false);
        setPatientCondition(null);
      }
    };

    checkPUZStatus();
  }, [patientId]);

  const canSetCriticalValues =
    userType === "DOCTOR" ||
    userType === "DISTRICT_DOCTOR" ||
    userType === "SPECIALIST_DOCTOR" ||
    userType === "NURSE";

  const canAddMeasurements =
    userType === "DOCTOR" ||
    userType === "DISTRICT_DOCTOR" ||
    userType === "SPECIALIST_DOCTOR" ||
    userType === "NURSE";

  const handleAddMeasurement = (item: (typeof monitoringItems)[0]) => {
    if (item.id === "ecg") {
      // ECG doesn't have an add functionality, it only views external data
      return;
    } else if (item.inputType === "file") {
      setSelectedFileUploadItem(item);
    } else {
      setSelectedItem(item);
    }
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
          patientId: patientId,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить измерение");
      }

      // Refresh measurements after successful POST
      const updatedResponse = await fetch(
        `/api/measurements?patientId=${patientId}`
      );
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setCurrentMeasurements(updatedData);
      }

      setSelectedItem(null);
    } catch (err) {
      console.error("Error saving measurement:", err);
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleFileUploadComplete = () => {
    // Refresh measurements if needed
    setSelectedFileUploadItem(null);
  };

  const getActiveAlert = (itemId: string) => {
    return alerts.find(
      (alert) =>
        alert.measurementType === itemId && alert.alertStatus === "CRITICAL"
    );
  };

  const regularItems = monitoringItems.filter((item) => !item.isPUZ);
  const puzItems = monitoringItems.filter(
    (item) => item.isPUZ && item.puzConditions?.includes(patientCondition!)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularItems.map((item) => {
              // Find the latest measurement for this type by sorting by createdAt desc
              const latestMeasurement = currentMeasurements
                .filter((m) => m.type === item.id)
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )[0];
              const activeAlert = getActiveAlert(item.id);
              const isAlert = !!activeAlert;
              const hasBluetoothSupport =
                item.id === "blood-pressure" || item.id === "pulse";
              return (
                <Card
                  key={item.id}
                  className={isAlert ? "border-red-500 bg-red-50" : ""}
                >
                  <CardHeader>
                    <CardTitle
                      className={`flex items-center justify-between ${isAlert ? "text-red-700" : ""}`}
                    >
                      <span>{item.title}</span>
                      {hasBluetoothSupport && (
                        <BluetoothIcon size={20} className="text-blue-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isAlert && (
                      <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-md">
                        <p className="text-xs text-red-600">
                          ⚠️ {activeAlert?.message}
                        </p>
                      </div>
                    )}
                    <div
                      className={`text-2xl font-bold ${isAlert ? "text-red-700" : ""}`}
                    >
                      {item.id === "ecg"
                        ? "ЭКГ"
                        : item.inputType === "file"
                          ? "Файлы"
                          : item.inputType === "boolean"
                            ? latestMeasurement
                              ? latestMeasurement.value1 === "Да"
                                ? "✓ Да"
                                : "✗ Нет"
                              : "✗ Нет"
                            : latestMeasurement
                              ? item.inputType === "double" &&
                                latestMeasurement.value2
                                ? `${latestMeasurement.value1}/${latestMeasurement.value2}`
                                : latestMeasurement.value1
                              : item.defaultValue}{" "}
                      {item.inputType !== "boolean" && item.unit}
                    </div>
                    <p className="text-sm text-gray-500">
                      {item.id === "ecg"
                        ? "Данные ЭКГ из внешней системы"
                        : item.inputType === "file"
                          ? "Посмотреть файлы в разделе 'Файлы'"
                          : `Последнее измерение: ${
                              latestMeasurement
                                ? new Date(
                                    latestMeasurement.createdAt
                                  ).toLocaleDateString("ru-RU")
                                : "Нет данных"
                            }`}
                    </p>
                    <div className="flex space-x-2 mt-4">
                      {canAddMeasurements && item.id !== "ecg" && (
                        <Button
                          className="hover:bg-blue-400 bg-blue-200"
                          variant="outline"
                          onClick={() => handleAddMeasurement(item)}
                        >
                          +
                        </Button>
                      )}
                      {item.inputType === "file" ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (item.id === "ecg") {
                              setSelectedECGViewItem(item);
                            } else {
                              setSelectedFilesViewItem(item);
                            }
                          }}
                        >
                          Посмотреть
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedStatsItem(item)}
                        >
                          Мониторинг
                        </Button>
                      )}
                      {canSetCriticalValues &&
                        item.inputType !== "file" &&
                        item.inputType !== "boolean" && (
                          <CriticalValuesModal
                            patientId={patientId}
                            measurementType={item.id}
                            measurementTitle={item.title}
                            onSave={() => {
                              // Refresh alerts after saving critical values
                              const fetchAlerts = async () => {
                                try {
                                  const response = await fetch(
                                    `/api/patient-alerts?patientId=${patientId}`
                                  );
                                  if (response.ok) {
                                    const alertsData = await response.json();
                                    setAlerts(alertsData);
                                  }
                                } catch (error) {
                                  console.error(
                                    "Error fetching alerts:",
                                    error
                                  );
                                }
                              };
                              fetchAlerts();
                            }}
                          />
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PUZ Section */}
      {isPUZPatient && puzItems.length > 0 && (
        <Card className="mt-6 border-2 border-blue-300">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-xl text-blue-700">
              ПУЗ (Пациенты под диспансерным наблюдением)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {puzItems.map((item) => {
                const latestMeasurement = currentMeasurements
                  .filter((m) => m.type === item.id)
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )[0];
                const activeAlert = getActiveAlert(item.id);
                const isAlert = !!activeAlert;
                return (
                  <Card
                    key={item.id}
                    className={
                      isAlert ? "border-red-500 bg-red-50" : "border-blue-200"
                    }
                  >
                    <CardHeader>
                      <CardTitle
                        className={isAlert ? "text-red-700" : "text-blue-700"}
                      >
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isAlert && (
                        <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-md">
                          <p className="text-xs text-red-600">
                            ⚠️ {activeAlert?.message}
                          </p>
                        </div>
                      )}
                      <div
                        className={`text-2xl font-bold ${
                          isAlert ? "text-red-700" : ""
                        }`}
                      >
                        {item.inputType === "boolean"
                          ? latestMeasurement
                            ? latestMeasurement.value1 === "Да"
                              ? "✓ Да"
                              : "✗ Нет"
                            : "✗ Нет"
                          : latestMeasurement
                            ? item.inputType === "double" &&
                              latestMeasurement.value2
                              ? `${latestMeasurement.value1}/${latestMeasurement.value2}`
                              : latestMeasurement.value1
                            : item.defaultValue}{" "}
                        {item.inputType !== "boolean" && item.unit}
                      </div>
                      <p className="text-sm text-gray-500">
                        {`Последнее измерение: ${
                          latestMeasurement
                            ? new Date(
                                latestMeasurement.createdAt
                              ).toLocaleDateString("ru-RU")
                            : "Нет данных"
                        }`}
                      </p>
                      <div className="flex space-x-2 mt-4">
                        {canAddMeasurements && (
                          <Button
                            className="hover:bg-blue-400 bg-blue-200"
                            variant="outline"
                            onClick={() => handleAddMeasurement(item)}
                          >
                            +
                          </Button>
                        )}
                        {item.inputType === "file" ? (
                          <Button
                            variant="outline"
                            onClick={() => setSelectedFilesViewItem(item)}
                          >
                            Посмотреть
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setSelectedStatsItem(item)}
                          >
                            Мониторинг
                          </Button>
                        )}
                        {canSetCriticalValues &&
                          item.inputType !== "file" &&
                          item.inputType !== "boolean" && (
                            <CriticalValuesModal
                              patientId={patientId}
                              measurementType={item.id}
                              measurementTitle={item.title}
                              onSave={() => {
                                const fetchAlerts = async () => {
                                  try {
                                    const response = await fetch(
                                      `/api/patient-alerts?patientId=${patientId}`
                                    );
                                    if (response.ok) {
                                      const alertsData = await response.json();
                                      setAlerts(alertsData);
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Error fetching alerts:",
                                      error
                                    );
                                  }
                                };
                                fetchAlerts();
                              }}
                            />
                          )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Self-Management Confidence Section - Only for PUZ patients */}
      {isPUZPatient && (
        <Card className="mt-6 border-2 border-purple-300">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-xl text-purple-700">
              Уверенность в самоменеджменте
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md mx-auto">
              {(() => {
                const latestConfidence = currentMeasurements
                  .filter((m) => m.type === "self-management-confidence")
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )[0];

                const confidenceLevel = latestConfidence
                  ? parseInt(latestConfidence.value1)
                  : null;

                // Determine color based on confidence level
                const getConfidenceColor = (level: number | null) => {
                  if (level === null) return "text-gray-500";
                  if (level >= 7) return "text-green-600";
                  if (level >= 4) return "text-yellow-600";
                  return "text-red-600";
                };

                const getConfidenceBgColor = (level: number | null) => {
                  if (level === null) return "bg-gray-50";
                  if (level >= 7) return "bg-green-50 border-green-300";
                  if (level >= 4) return "bg-yellow-50 border-yellow-300";
                  return "bg-red-50 border-red-300";
                };

                return (
                  <Card
                    className={`border-2 ${getConfidenceBgColor(confidenceLevel)}`}
                  >
                    <CardHeader>
                      <CardTitle
                        className={`text-center ${getConfidenceColor(confidenceLevel)}`}
                      >
                        Уровень:{" "}
                        {confidenceLevel !== null ? confidenceLevel : "—"} / 10
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div
                            className={`text-5xl font-bold ${getConfidenceColor(confidenceLevel)}`}
                          >
                            {confidenceLevel !== null ? confidenceLevel : "—"}
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Последнее обновление:{" "}
                            {latestConfidence
                              ? new Date(
                                  latestConfidence.createdAt
                                ).toLocaleDateString("ru-RU")
                              : "Нет данных"}
                          </p>
                        </div>

                        <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded border">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>7-10: Высокий уровень уверенности</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>4-6: Средний уровень уверенности</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>0-3: Низкий уровень уверенности</span>
                          </div>
                        </div>

                        {canAddMeasurements && (
                          <div className="flex justify-center gap-2">
                            <Button
                              className="hover:bg-purple-400 bg-purple-200"
                              variant="outline"
                              onClick={() =>
                                setSelectedItem({
                                  id: "self-management-confidence",
                                  title: "Уверенность",
                                  unit: "",
                                  inputType: "single",
                                  defaultValue: "0",
                                  isPUZ: true,
                                  puzConditions: ["АГ", "СД", "ХСН"],
                                })
                              }
                            >
                              Обновить уверенность
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStatsItem && selectedStatsItem.inputType !== "file" && (
        <StatisticsModal
          item={{
            ...selectedStatsItem,
            inputType: selectedStatsItem.inputType as
              | "single"
              | "double"
              | "text",
          }}
          measurements={currentMeasurements
            .filter((m) => m.type === selectedStatsItem.id)
            .map((m) => ({
              ...m,
              value2: m.value2 || null,
            }))}
          patientId={patientId}
          onClose={() => setSelectedStatsItem(null)}
        />
      )}

      {selectedItem && selectedItem.inputType !== "file" && (
        <MeasurementModal
          item={{
            ...selectedItem,
            inputType: selectedItem.inputType as "single" | "double" | "text",
          }}
          onClose={() => setSelectedItem(null)}
          onSubmit={handleModalSubmit}
        />
      )}

      {selectedFileUploadItem && (
        <FileUploadModal
          title={selectedFileUploadItem.title}
          onClose={() => setSelectedFileUploadItem(null)}
          onSubmit={handleFileUploadComplete}
          patientId={patientId}
        />
      )}

      {selectedFilesViewItem && selectedFilesViewItem.inputType === "file" && (
        <FilesViewModal
          title={selectedFilesViewItem.title}
          onClose={() => setSelectedFilesViewItem(null)}
          patientId={patientId}
        />
      )}

      {selectedECGViewItem && (
        <ECGViewModal
          onClose={() => setSelectedECGViewItem(null)}
          patientIIN={patientIIN}
        />
      )}
    </>
  );
};
