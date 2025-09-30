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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {monitoringItems.map((item) => {
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
                          : latestMeasurement
                            ? item.inputType === "double" &&
                              latestMeasurement.value2
                              ? `${latestMeasurement.value1}/${latestMeasurement.value2}`
                              : latestMeasurement.value1
                            : item.defaultValue}{" "}
                      {item.unit}
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
                      {canSetCriticalValues && item.inputType !== "file" && (
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
                                console.error("Error fetching alerts:", error);
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
