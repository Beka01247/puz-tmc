"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EditSubdivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  currentSubdivision: string | null;
  onUpdate: (newSubdivision: string | null) => void;
}

export const EditSubdivisionModal = ({
  isOpen,
  onClose,
  patientId,
  currentSubdivision,
  onUpdate,
}: EditSubdivisionModalProps) => {
  const [subdivision, setSubdivision] = useState(currentSubdivision || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/patients/${patientId}/subdivision`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subdivision: subdivision.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось обновить участок");
      }

      const data = await response.json();
      onUpdate(data.subdivision);
      toast.success("Участок успешно обновлен");
      onClose();
    } catch (error) {
      console.error("Error updating subdivision:", error);
      toast.error("Ошибка при обновлении участка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Изменить участок</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subdivision" className="text-right">
              Участок
            </Label>
            <Input
              id="subdivision"
              value={subdivision}
              onChange={(e) => setSubdivision(e.target.value)}
              className="col-span-3"
              placeholder="Участок №1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
