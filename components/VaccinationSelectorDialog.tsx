"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface VaccinationSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onVaccinationCreated: () => void;
}

export const VaccinationSelectorDialog = ({
  isOpen,
  onClose,
  patientId,
  onVaccinationCreated,
}: VaccinationSelectorDialogProps) => {
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [vaccineName, setVaccineName] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!scheduledDate || !vaccineName) {
      toast.error("Пожалуйста, заполните все обязательные поля");
      return;
    }

    try {
      const response = await fetch("/api/vaccinations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          name: vaccineName,
          scheduledDate: format(scheduledDate, "yyyy-MM-dd"),
          notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to create vaccination");

      toast.success("Вакцинация запланирована");
      onVaccinationCreated();
      handleClose();
    } catch {
      toast.error("Не удалось запланировать вакцинацию");
    }
  };

  const handleClose = () => {
    setVaccineName("");
    setScheduledDate(undefined);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запланировать вакцинацию</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название вакцины</Label>
            <Input
              id="name"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              placeholder="Введите название вакцины"
            />
          </div>

          <div className="space-y-2">
            <Label>Дата вакцинации</Label>
            <div className="border rounded-md p-3">
              {scheduledDate && (
                <p className="text-sm mb-4">
                  Выбранная дата: {format(scheduledDate, "dd.MM.yyyy")}
                </p>
              )}
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={setScheduledDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
