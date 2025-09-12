"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CallNotification {
  id: string;
  patientId: string;
  callerId: string;
  channelName: string;
  isVideoCall: boolean;
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
  participants?: string;
  callerName: string;
  callerUserType: string;
}

interface CallNotificationsProps {
  currentUserId: string;
}

const CallNotifications: React.FC<CallNotificationsProps> = ({
  currentUserId,
}) => {
  const [notifications, setNotifications] = useState<CallNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/call-notifications?activeOnly=true");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching call notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinCall = async (notification: CallNotification) => {
    // Navigate to the chat page with the call
    const patientId = notification.patientId;
    window.location.href = `/chat?patientId=${patientId}&join=${notification.channelName}`;
  };

  const formatUserType = (userType: string) => {
    switch (userType) {
      case "DOCTOR":
        return "Врач";
      case "NURSE":
        return "Медсестра";
      case "PATIENT":
        return "Пациент";
      case "REGIONAL_ADMIN":
        return "Региональный админ";
      case "CITY_ADMIN":
        return "Городской админ";
      case "DISTRICT_ADMIN":
        return "Районный админ";
      default:
        return userType;
    }
  };

  const getCallStatus = (notification: CallNotification) => {
    if (!notification.isActive) {
      return { text: "Завершен", color: "bg-gray-500" };
    }

    const participants = notification.participants
      ? JSON.parse(notification.participants)
      : [];

    if (participants.length > 1) {
      return { text: "В процессе", color: "bg-green-500" };
    } else {
      return { text: "Ожидание", color: "bg-yellow-500" };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Активные звонки</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Активные звонки</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Нет активных звонков</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Активные звонки
          <Badge variant="secondary">{notifications.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isMyCall = notification.callerId === currentUserId;
            const status = getCallStatus(notification);
            const startTime = new Date(
              notification.startedAt
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={notification.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {notification.isVideoCall ? (
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                      )}
                      <span className="font-medium">
                        {notification.isVideoCall
                          ? "Видео звонок"
                          : "Аудио звонок"}
                      </span>
                    </div>
                    <Badge className={`${status.color} text-white text-xs`}>
                      {status.text}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600">
                    {isMyCall ? (
                      <span>Вы начали звонок</span>
                    ) : (
                      <span>
                        {notification.callerName} (
                        {formatUserType(notification.callerUserType)})
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Начато в {startTime}
                  </div>
                </div>

                {notification.isActive && !isMyCall && (
                  <Button
                    size="sm"
                    onClick={() => handleJoinCall(notification)}
                    className="ml-3"
                  >
                    Присоединиться
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallNotifications;
