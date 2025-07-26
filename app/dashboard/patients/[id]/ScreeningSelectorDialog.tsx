"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Screening {
  id: string;
  name: string;
  description: string | null;
  gender: string | null;
  minAge: number | null;
  maxAge: number | null;
  frequency: string | null;
  years: string | null;
  testName: string | null;
  isRiskGroup: boolean;
}

interface ScreeningSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onScreeningCreated: () => void;
  patientGender: "МУЖСКОЙ" | "ЖЕНСКИЙ" | null;
  patientAge: number;
}

export const ScreeningSelectorDialog = ({
  isOpen,
  onClose,
  patientId,
  onScreeningCreated,
  patientGender,
  patientAge,
}: ScreeningSelectorDialogProps) => {
  const [availableScreenings, setAvailableScreenings] = useState<Screening[]>(
    []
  );
  const [selectedScreeningId, setSelectedScreeningId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const fetchAvailableScreenings = useCallback(async () => {
    try {
      const response = await fetch("/api/screenings");
      if (!response.ok) throw new Error("Failed to fetch screenings");
      const screenings: Screening[] = await response.json();

      // Filter screenings based on gender and age
      const filteredScreenings = screenings.filter((screening) => {
        const genderMatch =
          !screening.gender || screening.gender === patientGender;
        const ageMatch =
          (!screening.minAge || patientAge >= screening.minAge) &&
          (!screening.maxAge || patientAge <= screening.maxAge);

        return genderMatch && ageMatch;
      });

      setAvailableScreenings(filteredScreenings);
    } catch (error) {
      console.error("Error fetching screenings:", error);
      toast.error("Не удалось загрузить список скринингов");
    }
  }, [patientGender, patientAge]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableScreenings();
    }
  }, [isOpen, fetchAvailableScreenings]);

  const handleInvite = async () => {
    if (!selectedScreeningId) {
      toast.error("Выберите скрининг");
      return;
    }

    if (!selectedDate) {
      toast.error("Выберите дату");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/patients/${patientId}/screenings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screeningId: selectedScreeningId,
          scheduledDate: selectedDate.toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to create screening");

      toast.success("Приглашение на скрининг отправлено");
      onScreeningCreated();
      onClose();
    } catch (error) {
      console.error("Error creating screening:", error);
      toast.error("Не удалось создать приглашение на скрининг");
    } finally {
      setLoading(false);
    }
  };

  const selectedScreening = availableScreenings.find(
    (s) => s.id === selectedScreeningId
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Пригласить на скрининг</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Тип скрининга</label>
            <Select
              value={selectedScreeningId}
              onValueChange={setSelectedScreeningId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите скрининг" />
              </SelectTrigger>
              <SelectContent>
                {availableScreenings.map((screening) => (
                  <SelectItem key={screening.id} value={screening.id}>
                    {screening.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScreening?.description && (
            <div className="text-sm text-gray-600">
              {selectedScreening.description}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Дата скрининга</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Отмена
            </Button>
            <Button onClick={handleInvite} disabled={loading}>
              {loading ? "Отправка..." : "Пригласить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
