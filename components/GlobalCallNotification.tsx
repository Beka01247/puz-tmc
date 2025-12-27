"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GlobalCallNotificationProps {
  currentUserId: string;
}

interface IncomingCall {
  id: string;
  patientId: string;
  callerId: string;
  callerName: string;
  callerUserType: string;
  channelName: string;
  isVideoCall: boolean;
  isActive: boolean;
  startedAt: string;
}

const GlobalCallNotification: React.FC<GlobalCallNotificationProps> = ({
  currentUserId,
}) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [respondedCallIds, setRespondedCallIds] = useState<Set<string>>(
    new Set()
  );
  const router = useRouter();
  const pathname = usePathname();

  // Check if user is currently in chat
  const isInChat =
    pathname?.includes("/chat") || pathname?.includes("/dashboard/patients/");

  useEffect(() => {
    const checkForCalls = async () => {
      try {
        const response = await fetch("/api/call-notifications?activeOnly=true");
        if (response.ok) {
          const notifications: IncomingCall[] = await response.json();

          // Find calls where current user is not the caller and hasn't responded yet
          const relevantCall = notifications.find(
            (call) =>
              call.callerId !== currentUserId &&
              call.isActive &&
              !respondedCallIds.has(call.id)
          );

          if (relevantCall && relevantCall.id !== incomingCall?.id) {
            setIncomingCall(relevantCall);
            setIsVisible(true);
          } else if (!relevantCall && incomingCall) {
            // Call ended or was responded to
            setIncomingCall(null);
            setIsVisible(false);
          }
        }
      } catch (error) {
        console.error("Error checking for calls:", error);
      }
    };

    // Check immediately
    checkForCalls();

    // Poll every 3 seconds for new calls
    const interval = setInterval(checkForCalls, 3000);

    return () => clearInterval(interval);
  }, [currentUserId, incomingCall, respondedCallIds]);

  const handleJoinCall = () => {
    if (incomingCall) {
      // Mark this call as responded to
      setRespondedCallIds((prev) => new Set(prev).add(incomingCall.id));
      setIsVisible(false);
      setIncomingCall(null);
      router.push(
        `/chat?patientId=${incomingCall.patientId}&join=${incomingCall.channelName}`
      );
    }
  };

  const handleDismiss = () => {
    if (incomingCall) {
      // Mark this call as responded to (declined)
      setRespondedCallIds((prev) => new Set(prev).add(incomingCall.id));
    }
    setIsVisible(false);
    setIncomingCall(null);
  };

  const formatUserType = (userType: string) => {
    switch (userType) {
      case "DOCTOR":
      case "DISTRICT_DOCTOR":
      case "SPECIALIST_DOCTOR":
        return "Врач";
      case "NURSE":
        return "Медсестра";
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

  if (!isVisible || !incomingCall || isInChat) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-bounce">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-green-500 p-4 max-w-md">
        <div className="flex items-start gap-4">
          {/* Call Icon with Animation */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              {incomingCall.isVideoCall ? (
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Call Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Входящий {incomingCall.isVideoCall ? "видео" : "аудио"} звонок
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {incomingCall.callerName} (
              {formatUserType(incomingCall.callerUserType)})
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleJoinCall}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                size="sm"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Присоединиться
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalCallNotification;
