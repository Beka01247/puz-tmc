"use client";

import React, { useState, useEffect } from "react";
import { PuzCondition, RegistryRow, RiskLevel, CellData } from "@/types/puz";
import { evaluateRisk } from "@/lib/thresholds";
import {
  formatCellValue,
  getValueForRiskEvaluation,
} from "@/lib/utils/puzFormatters";
import {
  isMeasurementOverdue,
  getOverdueWarningMessage,
} from "@/lib/utils/measurementIntervals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import ECGViewModal from "@/components/ECGViewModal";
import FilesViewModal from "@/components/FilesViewModal";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type MetricCode =
  | "kpd"
  | "lpnp"
  | "ox"
  | "sak"
  | "rskf"
  | "ecg"
  | "smad"
  | "eye"
  | "bmi"
  | "smoking"
  | "foot"
  | "glucose"
  | "urine-microalbumin"
  | "urine-creatinine"
  | "sodium"
  | "potassium"
  | "probnp"
  | "ejection-fraction"
  | "echocardiography";

// Column definitions for each condition
const getColumnsForCondition = (condition: PuzCondition): MetricCode[] => {
  switch (condition) {
    case "АГ":
      return [
        "kpd",
        "lpnp",
        "ox",
        "sak",
        "rskf",
        "urine-microalbumin",
        "urine-creatinine",
        "ecg",
        "smad",
        "eye",
        "bmi",
        "smoking",
      ];
    case "СД":
      return [
        "glucose",
        "sak",
        "urine-microalbumin",
        "urine-creatinine",
        "lpnp",
        "kpd",
        "rskf",
        "smad",
        "foot",
        "eye",
        "smoking",
        "bmi",
      ];
    case "ХСН":
      return [
        "kpd",
        "rskf",
        "sodium",
        "potassium",
        "probnp",
        "ejection-fraction",
        "lpnp",
        "ox",
        "ecg",
        "echocardiography",
        "urine-microalbumin",
        "urine-creatinine",
        "sak",
        "smad",
        "smoking",
        "bmi",
      ];
    default:
      return [
        "kpd",
        "lpnp",
        "ox",
        "sak",
        "rskf",
        "ecg",
        "smad",
        "eye",
        "bmi",
        "smoking",
      ];
  }
};

interface MeasurementModalData {
  patientId: string;
  patientName: string;
  metricCode: MetricCode;
  metricName: string;
}

interface RegistryTableProps {
  condition?: PuzCondition;
}

const RegistryTable: React.FC<RegistryTableProps> = ({ condition = "АГ" }) => {
  const router = useRouter();
  const [data, setData] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [участокFilter, setУчастокFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const limit = 30;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] =
    useState<MeasurementModalData | null>(null);
  const [measurementHistory, setMeasurementHistory] = useState<
    Array<{
      id: string;
      value1: string;
      value2?: string | null;
      createdAt: string;
      risk?: string;
    }>
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ECG and Files modal state
  const [ecgModalOpen, setEcgModalOpen] = useState(false);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [selectedPatientIIN, setSelectedPatientIIN] = useState<string | null>(
    null
  );
  const [selectedFileTitle, setSelectedFileTitle] = useState<string>("");

  // Get columns for current condition
  const columns = getColumnsForCondition(condition);

  // Metric names mapping
  const metricNames: Record<MetricCode, string> = {
    kpd: "КПД",
    lpnp: "ЛПНП (холестерин)",
    ox: "О.Х. (общий холестерин)",
    foot: "Осмотр стоп",
    sak: "САК (HbA1c)",
    rskf: "рСКФ",
    ecg: "ЭКГ",
    smad: "СМАД (давление)",
    eye: "Осмотр глаз",
    bmi: "ИМТ",
    smoking: "Курение",
    glucose: "Глюкоза",
    "urine-microalbumin": "Микроальбумин (моча)",
    "urine-creatinine": "Креатинин (моча)",
    sodium: "Натрий",
    potassium: "Калий",
    probnp: "proBNP",
    "ejection-fraction": "ФВ",
    echocardiography: "Эхокардиография",
  };

  // Fetch data
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        condition,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (участокFilter && участокFilter !== "all")
        params.append("участок", участокFilter);
      if (riskFilter && riskFilter !== "all")
        params.append("riskLevel", riskFilter);

      const response = await fetch(`/api/puz/registry?${params}`);
      const result = await response.json();

      setData(result.data || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Error fetching registry data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, condition, search, участокFilter, riskFilter]);

  // Open measurement modal
  const handleCellClick = async (
    e: React.MouseEvent,
    patientId: string,
    patientName: string,
    metricCode: MetricCode,
    patientIIN?: string
  ) => {
    e.stopPropagation(); // Prevent row click

    // Handle ECG modal (external system)
    if (metricCode === "ecg") {
      setSelectedPatientId(patientId);
      setSelectedPatientIIN(patientIIN || null);
      setEcgModalOpen(true);
      return;
    }

    // Handle file-based measurements
    if (metricCode === "echocardiography") {
      setSelectedPatientId(patientId);
      setSelectedFileTitle(metricNames[metricCode]);
      setFilesModalOpen(true);
      return;
    }

    // Handle regular measurements with chart
    setSelectedMeasurement({
      patientId,
      patientName,
      metricCode,
      metricName: metricNames[metricCode],
    });
    setModalOpen(true);
    setLoadingHistory(true);

    try {
      // Fetch measurement history for this patient and metric
      const response = await fetch(
        `/api/patients/${patientId}/measurements?metricCode=${metricCode}&condition=${condition}`
      );
      const data = await response.json();
      setMeasurementHistory(data || []);
    } catch (error) {
      console.error("Error fetching measurement history:", error);
      setMeasurementHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setSearch("");
    setУчастокFilter("all");
    setRiskFilter("all");
    setPage(1);
    setTimeout(fetchData, 0);
  };

  // Get unique участки for filter
  const uniqueУчастки = Array.from(
    new Set(data.map((row) => row.участок).filter(Boolean))
  ) as string[];

  // Helper to get cell data with risk color
  const getCellData = (
    row: RegistryRow,
    metricCode: MetricCode
  ): CellData & { isOverdue: boolean | null; warningMessage?: string } => {
    const measurement = row.lastMeasurements[metricCode];
    const displayValue = formatCellValue(measurement, metricCode);

    if (displayValue === "X") {
      return {
        value: "X",
        risk: "neutral",
        isOverdue: null, // No warning for missing measurements
      };
    }

    const evaluationValue = getValueForRiskEvaluation(measurement, metricCode);
    const risk = evaluateRisk(
      evaluationValue,
      metricCode as MetricCode,
      condition
    );

    const measurementDate =
      measurement && "date" in measurement
        ? new Date(measurement.date)
        : undefined;

    const isOverdue = isMeasurementOverdue(
      measurementDate,
      metricCode as MetricCode,
      risk
    );

    const warningMessage =
      isOverdue && measurementDate
        ? getOverdueWarningMessage(
            metricCode as MetricCode,
            risk,
            measurementDate
          )
        : undefined;

    return {
      value: displayValue,
      risk,
      date: measurementDate?.toISOString(),
      tooltip:
        measurement && "date" in measurement
          ? `Последнее измерение: ${new Date(measurement.date).toLocaleDateString("ru-RU")}`
          : "Нет данных",
      isOverdue,
      warningMessage,
    };
  };

  // Helper to get background color class
  const getRiskColorClass = (risk: RiskLevel): string => {
    switch (risk) {
      case "red":
        return "bg-red-100 text-red-900";
      case "yellow":
        return "bg-yellow-100 text-yellow-900";
      case "green":
        return "bg-green-100 text-green-900";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Регистр ПУЗ — {condition === "АГ" && "Артериальная гипертензия"}
          {condition === "СД" && "Сахарный диабет"}
          {condition === "ХСН" && "Хроническая сердечная недостаточность"}
        </h2>
        <div className="text-sm text-gray-600">
          Всего пациентов: <span className="font-semibold">{total}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Поиск по ФИО, ИИН, телефону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={участокFilter} onValueChange={setУчастокFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Участок" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все участки</SelectItem>
            {uniqueУчастки.map((участок) => (
              <SelectItem key={участок} value={участок}>
                {участок}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Уровень риска" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="red">Высокий</SelectItem>
            <SelectItem value="yellow">Средний</SelectItem>
            <SelectItem value="green">Низкий</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} variant="default">
          Поиск
        </Button>
        <Button onClick={handleReset} variant="outline">
          Сбросить
        </Button>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
            <span>Высокий риск (3 мес)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
            <span>Средний риск (6 мес)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
            <span>Низкий риск (12 мес)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-300 rounded" />
            <span>Нет данных</span>
          </div>
        </div>
        <div className="text-sm">
          <span>
            Значок <strong>⚠️</strong> означает, что измерение просрочено и
            требует обновления
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="border border-blue-500 px-3 py-2 text-left font-medium min-w-[200px]">
                  ФИО
                </th>
                <th className="border border-blue-500 px-3 py-2 text-center font-medium w-20">
                  Участок
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border border-blue-500 px-3 py-2 text-center font-medium w-20"
                  >
                    {metricNames[col].split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="text-center py-8 text-gray-500"
                  >
                    Загрузка...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="text-center py-8 text-gray-500"
                  >
                    Нет данных
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  return (
                    <tr
                      key={row.patientId}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        router.push(`/dashboard/patients/${row.patientId}`);
                      }}
                    >
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="font-medium">{row.fio}</div>
                        <div className="text-xs text-gray-500">{row.phone}</div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center text-xs">
                        {row.участок || "—"}
                      </td>
                      {columns.map((col) => {
                        const cellData = getCellData(row, col);
                        const isFileType =
                          col === "ecg" || col === "echocardiography";

                        return (
                          <td
                            key={col}
                            className={`border border-gray-300 px-2 py-2 text-center ${!isFileType ? `cursor-pointer hover:opacity-75 ${getRiskColorClass(cellData.risk)}` : ""}`}
                            onClick={(e) => {
                              if (isFileType) {
                                e.stopPropagation();
                                return;
                              }
                              handleCellClick(
                                e,
                                row.patientId,
                                row.fio,
                                col,
                                row.iin
                              );
                            }}
                          >
                            {isFileType ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCellClick(
                                    e,
                                    row.patientId,
                                    row.fio,
                                    col,
                                    row.iin
                                  );
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span>{cellData.value}</span>
                                {cellData.isOverdue && (
                                  <div className="group relative">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-pre-line z-10 max-w-[140px]">
                                      {cellData.warningMessage}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Страница {page} из {totalPages} (показано {data.length} из {total})
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Вперед
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Measurement History Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>
              Мониторинг: {selectedMeasurement?.metricName}
            </DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">Загрузка...</div>
          ) : measurementHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет данных по измерениям
            </div>
          ) : (
            <div className="space-y-4">
              {/* Only show chart for numeric measurements */}
              {!["smoking", "foot", "eye", "echocardiography"].includes(
                selectedMeasurement?.metricCode || ""
              ) && (
                <Line
                  data={{
                    labels: [...measurementHistory].reverse().map((m) =>
                      new Date(m.createdAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    ),
                    datasets: [
                      {
                        label:
                          selectedMeasurement?.metricCode === "smad"
                            ? "Систолическое давление"
                            : "Значение",
                        data: [...measurementHistory]
                          .reverse()
                          .map((m) => parseFloat(m.value1) || 0),
                        borderColor: "rgb(75, 192, 192)",
                        backgroundColor: "rgba(75, 192, 192, 0.2)",
                        tension: 0.1,
                        pointBackgroundColor: [...measurementHistory]
                          .reverse()
                          .map((m) =>
                            m.risk === "red"
                              ? "rgb(255, 0, 0)"
                              : "rgb(75, 192, 192)"
                          ),
                        pointBorderColor: [...measurementHistory]
                          .reverse()
                          .map((m) =>
                            m.risk === "red"
                              ? "rgb(255, 0, 0)"
                              : "rgb(75, 192, 192)"
                          ),
                        pointRadius: [...measurementHistory]
                          .reverse()
                          .map((m) => (m.risk === "red" ? 8 : 3)),
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: "top" as const,
                        labels: {
                          color: "#000000",
                        },
                      },
                      title: {
                        display: true,
                        text: `График изменений: ${selectedMeasurement?.metricName}`,
                        color: "#000000",
                      },
                      tooltip: {
                        callbacks: {
                          ...(selectedMeasurement?.metricCode === "smad" && {
                            afterLabel: function (context: {
                              dataIndex: number;
                            }) {
                              const measurement = [
                                ...measurementHistory,
                              ].reverse()[context.dataIndex];
                              if (measurement && measurement.value2) {
                                return `Диастолическое давление: ${measurement.value2}`;
                              }
                              return "";
                            },
                          }),
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: "#000000",
                        },
                        grid: {
                          color: "#374151",
                        },
                      },
                      y: {
                        ticks: {
                          color: "#000000",
                        },
                        grid: {
                          color: "#374151",
                        },
                      },
                    },
                  }}
                />
              )}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Все измерения</h3>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="space-y-2">
                      {[...measurementHistory].reverse().map((m, index) => {
                        const isBooleanType = [
                          "smoking",
                          "foot",
                          "eye",
                        ].includes(selectedMeasurement?.metricCode || "");
                        const displayValue = isBooleanType
                          ? m.value1 === "Да"
                            ? "✓ Да"
                            : "✗ Нет"
                          : m.value2
                            ? `${m.value1}/${m.value2}`
                            : m.value1;

                        return (
                          <li
                            key={index}
                            className={`text-sm ${m.risk === "red" ? "text-red-600 font-semibold" : ""}`}
                          >
                            {m.risk === "red" && "⚠️ "}
                            {new Date(m.createdAt).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            : {displayValue}
                            {m.risk === "red" && " (критическое значение)"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ECG View Modal */}
      {ecgModalOpen && (
        <ECGViewModal
          onClose={() => setEcgModalOpen(false)}
          patientIIN={selectedPatientIIN || undefined}
        />
      )}

      {/* Files View Modal */}
      {filesModalOpen && selectedPatientId && (
        <FilesViewModal
          title={selectedFileTitle}
          onClose={() => setFilesModalOpen(false)}
          patientId={selectedPatientId}
        />
      )}
    </div>
  );
};

export default RegistryTable;
