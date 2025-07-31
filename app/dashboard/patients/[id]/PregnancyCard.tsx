"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, addWeeks, differenceInWeeks, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PregnancyCardProps {
  patientId: string;
  isDoctor: boolean;
  isProvider?: boolean; // Add this to handle both doctors and nurses
}

export const PregnancyCard = ({
  patientId,
  isDoctor,
  isProvider = false,
}: PregnancyCardProps) => {
  const [isPregnant, setIsPregnant] = useState(false);
  const [lmpDate, setLmpDate] = useState<Date>();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Use isProvider to allow both doctors and nurses to edit
  const canEdit = isDoctor || isProvider;

  useEffect(() => {
    const fetchPregnancyStatus = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}/pregnancy`);
        if (!response.ok) {
          throw new Error("Failed to fetch pregnancy status");
        }
        const data = await response.json();
        if (data) {
          setIsPregnant(true);
          setLmpDate(new Date(data.lmp));
        }
      } catch (error) {
        console.error("Error fetching pregnancy status:", error);
        toast.error("Не удалось загрузить данные о беременности");
      } finally {
        setLoading(false);
      }
    };

    void fetchPregnancyStatus();
  }, [patientId]);

  const handlePregnancyToggle = async (checked: boolean) => {
    if (!canEdit || updating) return;

    if (!checked) {
      setShowConfirmDialog(true);
      return;
    }

    setIsPregnant(checked);
  };

  const handleConfirmEndPregnancy = async () => {
    setUpdating(true);
    setIsPregnant(false);

    try {
      const response = await fetch(`/api/patients/${patientId}/pregnancy`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to update pregnancy status");

      setLmpDate(undefined);
      toast.success("Беременность завершена");
    } catch (error) {
      console.error("Error updating pregnancy status:", error);
      toast.error("Ошибка при обновлении статуса беременности");
      setIsPregnant(true);
    } finally {
      setUpdating(false);
      setShowConfirmDialog(false);
    }
  };

  const handleLmpDateChange = async (date: Date | undefined) => {
    if (!canEdit || !date || updating) return;

    setUpdating(true);
    const previousDate = lmpDate;

    try {
      const response = await fetch(`/api/patients/${patientId}/pregnancy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lmp: date.toISOString() }),
      });

      if (!response.ok) throw new Error("Failed to update LMP date");

      setLmpDate(date);
      toast.success("Дата последней менструации сохранена");
      setIsPregnant(true);
    } catch (error) {
      console.error("Error saving LMP date:", error);
      toast.error("Ошибка при сохранении даты");
      setLmpDate(previousDate);
    } finally {
      setUpdating(false);
    }
  };

  const calculatePregnancyInfo = (lmpDate: Date) => {
    const now = new Date();
    const weeksPregnant = differenceInWeeks(now, lmpDate);
    const dueDate = addDays(addWeeks(lmpDate, 40), -1); // 40 weeks minus 1 day from LMP
    return {
      weeks: weeksPregnant,
      dueDate,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Беременность</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
        >
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pregnancy"
              checked={isPregnant}
              onCheckedChange={handlePregnancyToggle}
              disabled={!canEdit || updating}
            />
            <label
              htmlFor="pregnancy"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Беременна{" "}
              {updating && (
                <Loader2 className="inline-block h-4 w-4 animate-spin ml-2" />
              )}
            </label>
          </div>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Подтвердите завершение беременности
              </AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите завершить беременность? Это действие
                нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmEndPregnancy}>
                Подтвердить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isPregnant && (
          <>
            <div className="space-y-2">
              <span className="text-sm font-medium">
                Дата последней менструации:
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !lmpDate && "text-muted-foreground"
                    )}
                    disabled={!canEdit || updating}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {lmpDate
                      ? format(lmpDate, "d MMMM yyyy", { locale: ru })
                      : "Выберите дату"}
                    {updating && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={lmpDate}
                    onSelect={handleLmpDateChange}
                    disabled={(date) => {
                      const now = new Date();
                      const nineMonthsAgo = new Date(
                        now.setMonth(now.getMonth() - 9)
                      );
                      return date > new Date() || date < nineMonthsAgo;
                    }}
                    initialFocus
                    locale={ru}
                    weekStartsOn={1}
                    ISOWeek
                  />
                </PopoverContent>
              </Popover>
            </div>
            {lmpDate && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Срок беременности:</span>
                  <span className="font-medium">
                    {calculatePregnancyInfo(lmpDate).weeks} недель
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Предполагаемая дата родов:</span>
                  <span className="font-medium">
                    {format(
                      calculatePregnancyInfo(lmpDate).dueDate,
                      "d MMMM yyyy",
                      { locale: ru }
                    )}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
