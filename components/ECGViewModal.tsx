"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ECGResult {
  ecgDate: string;
  monitorSN: string;
  fio: string;
  ecgDescription: string;
  recordedBy: string;
  recordedByOrg: string;
  diagnosedBy: string;
  diagnosedByOrg: string;
  ecgLink: string;
}

interface ECGViewModalProps {
  onClose: () => void;
  patientIIN?: string;
}

const ECGViewModal = ({ onClose, patientIIN }: ECGViewModalProps) => {
  const [ecgResults, setEcgResults] = useState<ECGResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchECGData = async () => {
      if (!patientIIN) {
        toast.error("ИИН пациента не найден");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/ecg?iin=${patientIIN}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch ECG data: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        setEcgResults(data.ecgResults || []);
      } catch (error) {
        console.error("Error fetching ECG data:", error);
        toast.error("Ошибка при загрузке данных ЭКГ");
      } finally {
        setLoading(false);
      }
    };

    fetchECGData();
  }, [patientIIN]);

  const handleViewECG = (ecgLink: string) => {
    window.open(ecgLink, "_blank");
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd.MM.yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Результаты ЭКГ
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Загрузка данных ЭКГ...</div>
        ) : ecgResults.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              У пациента нет записей ЭКГ в системе
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="text-sm text-muted-foreground mb-4">
              Найдено {ecgResults.length} записей ЭКГ
            </div>

            <div className="grid gap-4">
              {ecgResults.map((ecg, index) => (
                <Card key={index} className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          ЭКГ от {formatDate(ecg.ecgDate)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Пациент: {ecg.fio}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => handleViewECG(ecg.ecgLink)}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Посмотреть ЭКГ
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                          Описание ЭКГ:
                        </h4>
                        <p className="text-sm">{ecg.ecgDescription}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Записал:</span>
                          <br />
                          {ecg.recordedBy}
                          <br />
                          {ecg.recordedByOrg}
                        </div>
                        <div>
                          <span className="font-medium">Диагностировал:</span>
                          <br />
                          {ecg.diagnosedBy}
                          <br />
                          {ecg.diagnosedByOrg}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">
                          Серийный номер монитора:
                        </span>{" "}
                        {ecg.monitorSN}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ECGViewModal;
