"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface RiskGroup {
  id?: string;
  name: string;
}

interface EditRiskGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskGroups: RiskGroup[] | undefined;
  patientId: string;
  onSave: (riskGroups: RiskGroup[]) => void;
}

export const EditRiskGroupsModal = ({
  isOpen,
  onClose,
  riskGroups: initialRiskGroups = [],
  patientId,
  onSave,
}: EditRiskGroupsModalProps) => {
  const [riskGroups, setRiskGroups] = useState<RiskGroup[]>(initialRiskGroups);
  const ALLOWED_RISK_GROUPS = ["ПУЗ", "ДН"];

  const handleAddRiskGroup = async (groupName: string) => {
    // If there's an existing group, remove it first
    if (riskGroups.length > 0) {
      await handleRemoveRiskGroup(0);
    }

    try {
      const response = await fetch(`/api/patients/${patientId}/risk-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось добавить группу риска");
      }

      const addedRiskGroup = await response.json();
      setRiskGroups([addedRiskGroup]); // Replace any existing groups
      toast.success("Группа риска изменена");
    } catch (error) {
      console.error("Ошибка при добавлении группы:", error);
      toast.error("Ошибка при добавлении группы");
    }
  };

  const handleRemoveRiskGroup = async (index: number) => {
    const riskGroup = riskGroups[index];
    if (!riskGroup.id) {
      setRiskGroups(riskGroups.filter((_, i) => i !== index));
      return;
    }

    try {
      const response = await fetch(`/api/patients/${patientId}/risk-groups`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: riskGroup.id }),
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить группу риска");
      }

      setRiskGroups(riskGroups.filter((_, i) => i !== index));
      toast.success("Группа удалена");
    } catch (error) {
      console.error("Ошибка при удалении группы:", error);
      toast.error("Ошибка при удалении группы");
    }
  };

  const handleSave = () => {
    onSave(riskGroups);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать группы</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {riskGroups.length > 0 ? (
            riskGroups.map((riskGroup, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 p-2 border rounded-md bg-gray-50">
                  {riskGroup.name}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveRiskGroup(index)}
                >
                  Удалить
                </Button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Группы отсутствуют</p>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {ALLOWED_RISK_GROUPS.map((groupName) => (
                <Button
                  key={groupName}
                  onClick={() => handleAddRiskGroup(groupName)}
                  variant="outline"
                  className="flex-1"
                  disabled={riskGroups.some(
                    (group) => group.name === groupName
                  )}
                >
                  {groupName}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave}>Сохранить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
