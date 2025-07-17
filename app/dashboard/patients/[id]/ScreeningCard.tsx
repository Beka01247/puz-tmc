import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { ScreeningSelectorDialog } from "./ScreeningSelectorDialog";

interface Screening {
  id: string;
  name: string;
  description: string | null;
  testName: string | null;
}

interface PatientScreening {
  id: string;
  screeningId: string;
  customScreeningName: string | null;
  scheduledDate: string;
  status: "INVITED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "REJECTED";
  result: string | null;
  notes: string | null;
  completedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  createdAt: string;
  screening: Screening;
}

interface Invitation {
  id: string;
  riskGroup: string;
  status: string;
  providerName: string | null;
  createdAt: string;
}

interface ScreeningWithInvitation extends PatientScreening {
  providerName?: string | null;
  isInvitation?: boolean;
}

interface ScreeningCardProps {
  patientId: string;
  screenings: PatientScreening[];
  invitations: Invitation[];
  patientGender: "МУЖСКОЙ" | "ЖЕНСКИЙ" | null;
  patientAge: number;
  onScreeningUpdated: () => void;
  userType: string;
}

export const ScreeningCard = ({
  patientId,
  screenings,
  invitations = [],
  patientGender,
  patientAge,
  onScreeningUpdated,
  userType,
}: ScreeningCardProps) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const isProvider = ["DOCTOR", "NURSE"].includes(userType || "");

  const handleStatusUpdate = async (
    patientScreeningId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(
        "/api/patients/" + patientId + "/screenings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientScreeningId,
            status: newStatus,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update screening");

      toast.success("Статус скрининга обновлен");
      onScreeningUpdated();
    } catch (error) {
      console.error("Error updating screening:", error);
      toast.error("Не удалось обновить статус");
    }
  };

  // Add handler for invitation status update
  const handleInvitationStatusUpdate = async (
    invitationId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch("/api/invitations/" + invitationId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update invitation");
      toast.success("Статус анализа обновлен");
      onScreeningUpdated();
    } catch (error) {
      console.error("Error updating invitation:", error);
      toast.error("Не удалось обновить статус анализа");
    }
  };

  const renderStatusActions = (screening: PatientScreening) => {
    if (isProvider) {
      switch (screening.status) {
        case "COMPLETED":
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(screening.id, "CONFIRMED")}
              >
                Подтвердить
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusUpdate(screening.id, "REJECTED")}
              >
                Отклонить
              </Button>
            </div>
          );
        default:
          return null;
      }
    } else {
      switch (screening.status) {
        case "INVITED":
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(screening.id, "COMPLETED")}
              >
                Пройдено
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusUpdate(screening.id, "CANCELLED")}
              >
                Отменить
              </Button>
            </div>
          );
        default:
          return null;
      }
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "INVITED":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "INVITED":
        return "Приглашен";
      case "COMPLETED":
        return "Ожидает подтверждения";
      case "CONFIRMED":
        return "Подтвержден";
      case "CANCELLED":
        return "Отменен";
      case "REJECTED":
        return "Отклонен";
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Скрининги</CardTitle>
        <CardDescription>
          Запланированные и пройденные скрининги
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProvider && (
          <Button onClick={() => setIsInviteDialogOpen(true)} className="mb-4">
            Пригласить на скрининг
          </Button>
        )}
        <div className="space-y-4 h-[300px] overflow-y-auto pr-2">
          {(
            [
              ...screenings,
              ...invitations.map(
                (inv): ScreeningWithInvitation => ({
                  id: inv.id,
                  screeningId: "",
                  customScreeningName: inv.riskGroup,
                  scheduledDate: inv.createdAt,
                  status: inv.status as PatientScreening["status"],
                  result: null,
                  notes: null,
                  completedAt: null,
                  confirmedAt: null,
                  confirmedBy: null,
                  createdAt: inv.createdAt,
                  screening: {
                    id: "",
                    name: inv.riskGroup,
                    description: null,
                    testName: null,
                  },
                  providerName: inv.providerName,
                  isInvitation: true,
                })
              ),
            ] as ScreeningWithInvitation[]
          ).map((screening) => (
            <div
              key={screening.id + (screening.isInvitation ? "-inv" : "")}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">
                    {screening.screening?.name || screening.customScreeningName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Дата:{" "}
                    {format(new Date(screening.scheduledDate), "dd.MM.yyyy")}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${getStatusBadgeColor(
                      screening.status
                    )}`}
                  >
                    {getStatusText(screening.status)}
                  </span>
                  {screening.isInvitation && screening.providerName && (
                    <div className="text-xs text-gray-400 mt-1">
                      Врач: {screening.providerName}
                    </div>
                  )}
                </div>
                <div className="min-w-[120px]">
                  {screening.isInvitation ? (
                    isProvider ? (
                      screening.status === "COMPLETED" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleInvitationStatusUpdate(
                                screening.id,
                                "CONFIRMED"
                              )
                            }
                          >
                            Подтвердить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleInvitationStatusUpdate(
                                screening.id,
                                "REJECTED"
                              )
                            }
                          >
                            Отклонить
                          </Button>
                        </div>
                      ) : null
                    ) : screening.status === "INVITED" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleInvitationStatusUpdate(
                              screening.id,
                              "COMPLETED"
                            )
                          }
                        >
                          Пройдено
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleInvitationStatusUpdate(
                              screening.id,
                              "CANCELLED"
                            )
                          }
                        >
                          Отменить
                        </Button>
                      </div>
                    ) : null
                  ) : (
                    renderStatusActions(screening)
                  )}
                </div>
              </div>
              {screening.screening?.description && (
                <p className="text-sm text-gray-600">
                  {screening.screening.description}
                </p>
              )}
              {screening.notes && (
                <p className="text-sm text-gray-600">
                  Примечание: {screening.notes}
                </p>
              )}
            </div>
          ))}

          {screenings.length === 0 && invitations.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              Нет запланированных скринингов или анализов
            </p>
          )}
        </div>
        <ScreeningSelectorDialog
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          patientId={patientId}
          onScreeningCreated={onScreeningUpdated}
          patientGender={patientGender}
          patientAge={patientAge}
        />
      </CardContent>
    </Card>
  );
};
