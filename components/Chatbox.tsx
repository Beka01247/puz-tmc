"use client";

import React, { useEffect, useRef, useState } from "react";
import type { FC } from "react";
import { useChannel } from "ably/react";
import type * as Ably from "ably";
import VideoCallModal from "./VideoCallModal";

type Message = {
  id: string;
  message: string;
  sender: {
    id: string;
    name: string;
    role: "DOCTOR" | "NURSE" | "PATIENT" | "SYSTEM";
  };
  createdAt: string;
  callInvitation?: {
    channelName: string;
    isVideoCall: boolean;
    callerName: string;
    callerRole: string;
    callerId: string; // Track who started the call
  };
};

interface ChatBoxProps {
  patientId: string;
  currentUser: {
    id: string;
    name: string;
    role: "DOCTOR" | "NURSE" | "PATIENT";
  };
  joinChannelName?: string;
}

const ChatBox: FC<ChatBoxProps> = ({
  patientId,
  currentUser,
  joinChannelName,
}) => {
  const [messageText, setMessageText] = useState<string>("");
  const [receivedMessages, setMessages] = useState<Message[]>([]);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isAudioCall, setIsAudioCall] = useState(false);
  const [currentChannelName, setCurrentChannelName] = useState<string>("");
  const [activeCall, setActiveCall] = useState<{
    channelName: string;
    isVideoCall: boolean;
    participants: string[];
    startedBy: string;
    startedAt: string;
  } | null>(null);
  const [hasActiveCallWithPatient, setHasActiveCallWithPatient] =
    useState(false);
  const [isCheckingCall, setIsCheckingCall] = useState(false);
  const messageTextIsEmpty = messageText.trim().length === 0;
  const inputBox = useRef<HTMLTextAreaElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);

  const { channel } = useChannel(
    `patient-${patientId}`,
    (message: Ably.Message) => {
      if (message.name === "chat-message") {
        const messageData = message.data as {
          text: string;
          sender: {
            id: string;
            name: string;
            role: "DOCTOR" | "NURSE" | "PATIENT";
          };
          timestamp: number;
        };

        // Add message to local state for real-time display
        const newMessage: Message = {
          id: Date.now().toString(), // Temporary ID for real-time messages
          message: messageData.text,
          sender: messageData.sender,
          createdAt: new Date().toISOString(),
        };

        setMessages((prevMessages) => {
          const history = prevMessages.slice(-199);
          return [...history, newMessage];
        });
      } else if (message.name === "call-started") {
        const callData = message.data as {
          channelName: string;
          isVideoCall: boolean;
          startedBy: string;
          startedByName: string;
        };

        // If this call was started by current user for this patient, mark as active
        if (callData.startedBy === currentUser.id) {
          setHasActiveCallWithPatient(true);
        }

        setActiveCall({
          channelName: callData.channelName,
          isVideoCall: callData.isVideoCall,
          participants: [callData.startedBy],
          startedBy: callData.startedByName,
          startedAt: new Date().toISOString(),
        });
      } else if (message.name === "call-ended") {
        setActiveCall(null);
        // Reset active call flag if call ended
        setHasActiveCallWithPatient(false);
      } else if (message.name === "participant-joined") {
        const participantData = message.data as {
          userId: string;
          channelName: string;
        };

        setActiveCall((prev) => {
          if (prev && prev.channelName === participantData.channelName) {
            return {
              ...prev,
              participants: [
                ...new Set([...prev.participants, participantData.userId]),
              ],
            };
          }
          return prev;
        });
      } else if (message.name === "participant-left") {
        const participantData = message.data as {
          userId: string;
          channelName: string;
        };

        setActiveCall((prev) => {
          if (prev && prev.channelName === participantData.channelName) {
            const newParticipants = prev.participants.filter(
              (p) => p !== participantData.userId
            );
            // If no participants left, end the call
            if (newParticipants.length === 0) {
              return null;
            }
            return {
              ...prev,
              participants: newParticipants,
            };
          }
          return prev;
        });
      }
    }
  );

  // Load messages from database
  const loadMessages = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/chat?patientId=${patientId}`);
      if (response.ok) {
        const messages = await response.json();
        setMessages(messages);
      }
    } catch (error) {
      console.error("Ошибка при загрузке сообщений:", error);
    }
  }, [patientId]);

  // Check for active calls with this patient
  const checkActiveCall = React.useCallback(async () => {
    // Validate patientId before making API call
    if (!patientId || patientId === "api" || !currentUser?.id) {
      console.warn("Invalid patientId or currentUser.id:", {
        patientId,
        userId: currentUser?.id,
      });
      return;
    }

    try {
      // Fetch active calls for this specific patient
      const response = await fetch(
        `/api/call-notifications?activeOnly=true&patientId=${patientId}`
      );
      if (response.ok) {
        const notifications = await response.json();

        // Check if there's an active call for this patient initiated by current user
        const activeCallForPatient = notifications.find(
          (n: { patientId: string; callerId: string; isActive: boolean }) =>
            n.patientId === patientId &&
            n.callerId === currentUser.id &&
            n.isActive
        );
        setHasActiveCallWithPatient(!!activeCallForPatient);

        // Check for ANY active call for this patient (to show join button)
        const anyActiveCall = notifications.find(
          (n: {
            patientId: string;
            isActive: boolean;
            channelName: string;
            isVideoCall: boolean;
            callerName: string;
          }) => n.patientId === patientId && n.isActive
        );

        if (anyActiveCall) {
          setActiveCall({
            channelName: anyActiveCall.channelName,
            isVideoCall: anyActiveCall.isVideoCall,
            participants: [],
            startedBy: anyActiveCall.callerName,
            startedAt: new Date().toISOString(),
          });
        } else {
          setActiveCall(null);
        }
      }
    } catch (error) {
      console.error("Error checking active calls:", error);
    }
  }, [patientId, currentUser?.id]);

  useEffect(() => {
    loadMessages();
    checkActiveCall();

    // Poll for active calls every 5 seconds
    const interval = setInterval(checkActiveCall, 5000);
    return () => clearInterval(interval);
  }, [loadMessages, checkActiveCall]);

  // Handle join parameter - show a join button instead of auto-joining
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinCallDetails, setJoinCallDetails] = useState<{
    channelName: string;
    isVideoCall: boolean;
    callerName: string;
  } | null>(null);

  useEffect(() => {
    const checkJoinCall = async () => {
      if (joinChannelName && !isVideoCallOpen && !showJoinPrompt) {
        try {
          const response = await fetch(
            "/api/call-notifications?activeOnly=true"
          );
          if (response.ok) {
            const notifications = await response.json();
            const targetCall = notifications.find(
              (n: { channelName: string; isActive: boolean }) =>
                n.channelName === joinChannelName && n.isActive
            );

            if (targetCall) {
              setJoinCallDetails({
                channelName: joinChannelName,
                isVideoCall: targetCall.isVideoCall,
                callerName: targetCall.callerName,
              });
              setShowJoinPrompt(true);
            }
          }
        } catch (error) {
          console.error("Error checking call for join:", error);
        }
      }
    };

    checkJoinCall();
  }, [joinChannelName, isVideoCallOpen, showJoinPrompt]);

  const handleJoinFromPrompt = async () => {
    if (!joinCallDetails) return;

    setCurrentChannelName(joinCallDetails.channelName);
    setIsAudioCall(!joinCallDetails.isVideoCall);
    setIsVideoCallOpen(true);
    setShowJoinPrompt(false);

    // Broadcast that user joined the call
    await channel.publish({
      name: "participant-joined",
      data: {
        userId: currentUser.id,
        channelName: joinCallDetails.channelName,
      },
    });
  };

  const sendChatMessage = async (messageText: string) => {
    try {
      // Save to database first
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          message: messageText,
        }),
      });

      if (response.ok) {
        // Send via Ably for real-time delivery
        channel.publish({
          name: "chat-message",
          data: {
            text: messageText,
            sender: currentUser,
            timestamp: Date.now(),
          },
        });
      }
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
    }

    setMessageText("");
    inputBox.current?.focus();
  };

  const handleFormSubmission = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendChatMessage(messageText);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.charCode !== 13 || messageTextIsEmpty) {
      return;
    }
    sendChatMessage(messageText);
    event.preventDefault();
  };

  const handleAudioCall = async () => {
    // Prevent starting a new call if there's already an active call
    if (hasActiveCallWithPatient || isVideoCallOpen) {
      alert(
        "У вас уже есть активный звонок с этим пациентом. Завершите текущий звонок перед началом нового."
      );
      return;
    }

    setIsCheckingCall(true);
    const channelName = generateChannelName();
    setCurrentChannelName(channelName);

    // Create call notification in database
    try {
      const response = await fetch("/api/call-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          channelName,
          isVideoCall: false,
          participants: [currentUser.id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Conflict - already has active call
          alert(
            errorData.error ||
              "У вас уже есть активный звонок с этим пациентом."
          );
          setHasActiveCallWithPatient(true);
          // Optionally, join the existing call instead
          if (errorData.existingCall) {
            setCurrentChannelName(errorData.existingCall.channelName);
            setIsAudioCall(!errorData.existingCall.isVideoCall);
            setIsVideoCallOpen(true);
          }
          setIsCheckingCall(false);
          return;
        }
        throw new Error(
          errorData.error || "Failed to create call notification"
        );
      }

      // Update state after successful creation
      setHasActiveCallWithPatient(true);

      // Immediately open the call modal so doctor joins right away
      setIsAudioCall(true);
      setIsVideoCallOpen(true);
    } catch (error) {
      console.error("Error creating call notification:", error);
      alert("Не удалось начать звонок. Попробуйте еще раз.");
      setIsCheckingCall(false);
      return;
    } finally {
      setIsCheckingCall(false);
    }

    // Get the call notification ID to include in invitation
    let callNotificationId = "";
    try {
      const notificationResponse = await fetch(
        "/api/call-notifications?activeOnly=true"
      );
      if (notificationResponse.ok) {
        const notifications = await notificationResponse.json();
        const thisCall = notifications.find(
          (n: { channelName: string; callerId: string }) =>
            n.channelName === channelName && n.callerId === currentUser.id
        );
        if (thisCall) callNotificationId = thisCall.id;
      }
    } catch (error) {
      console.error("Error fetching call notification ID:", error);
    }

    // Send call invitation via Ably
    await channel.publish({
      name: "call-invitation",
      data: {
        channelName,
        isVideoCall: false,
        callerName: currentUser.name,
        callerRole: currentUser.role,
        callerId: currentUser.id,
        callId: callNotificationId || channelName,
      },
    });

    // Broadcast that call has started
    await channel.publish({
      name: "call-started",
      data: {
        channelName,
        isVideoCall: false,
        startedBy: currentUser.id,
        startedByName: currentUser.name,
      },
    });
  };

  const handleVideoCall = async () => {
    // Prevent starting a new call if there's already an active call
    if (hasActiveCallWithPatient || isVideoCallOpen) {
      alert(
        "У вас уже есть активный звонок с этим пациентом. Завершите текущий звонок перед началом нового."
      );
      return;
    }

    setIsCheckingCall(true);
    const channelName = generateChannelName();
    setCurrentChannelName(channelName);

    // Create call notification in database
    try {
      const response = await fetch("/api/call-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          channelName,
          isVideoCall: true,
          participants: [currentUser.id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Conflict - already has active call
          alert(
            errorData.error ||
              "У вас уже есть активный звонок с этим пациентом."
          );
          setHasActiveCallWithPatient(true);
          // Optionally, join the existing call instead
          if (errorData.existingCall) {
            setCurrentChannelName(errorData.existingCall.channelName);
            setIsAudioCall(!errorData.existingCall.isVideoCall);
            setIsVideoCallOpen(true);
          }
          setIsCheckingCall(false);
          return;
        }
        throw new Error(
          errorData.error || "Failed to create call notification"
        );
      }

      // Update state after successful creation
      setHasActiveCallWithPatient(true);

      // Immediately open the call modal so doctor joins right away
      setIsAudioCall(false);
      setIsVideoCallOpen(true);
    } catch (error) {
      console.error("Error creating call notification:", error);
      alert("Не удалось начать звонок. Попробуйте еще раз.");
      setIsCheckingCall(false);
      return;
    } finally {
      setIsCheckingCall(false);
    }

    // Get the call notification ID to include in invitation
    let callNotificationId = "";
    try {
      const notificationResponse = await fetch(
        "/api/call-notifications?activeOnly=true"
      );
      if (notificationResponse.ok) {
        const notifications = await notificationResponse.json();
        const thisCall = notifications.find(
          (n: { channelName: string; callerId: string }) =>
            n.channelName === channelName && n.callerId === currentUser.id
        );
        if (thisCall) callNotificationId = thisCall.id;
      }
    } catch (error) {
      console.error("Error fetching call notification ID:", error);
    }

    // Send call invitation via Ably
    await channel.publish({
      name: "call-invitation",
      data: {
        channelName,
        isVideoCall: true,
        callerName: currentUser.name,
        callerRole: currentUser.role,
        callerId: currentUser.id,
        callId: callNotificationId || channelName,
      },
    });

    // Broadcast that call has started
    await channel.publish({
      name: "call-started",
      data: {
        channelName,
        isVideoCall: true,
        startedBy: currentUser.id,
        startedByName: currentUser.name,
      },
    });
  };

  const handleJoinCall = async () => {
    if (!activeCall) return;

    setCurrentChannelName(activeCall.channelName);
    setIsAudioCall(!activeCall.isVideoCall);
    setIsVideoCallOpen(true);

    // Broadcast that user joined the call
    await channel.publish({
      name: "participant-joined",
      data: {
        userId: currentUser.id,
        channelName: activeCall.channelName,
      },
    });
  };

  const handleEndCall = async () => {
    if (currentChannelName) {
      let isCallInitiator = false;

      // Broadcast that user left the call first
      await channel.publish({
        name: "participant-left",
        data: {
          userId: currentUser.id,
          channelName: currentChannelName,
        },
      });

      // Check if current user is the call initiator
      try {
        const notificationsResponse = await fetch("/api/call-notifications");
        if (notificationsResponse.ok) {
          const notifications = await notificationsResponse.json();
          const activeCallNotification = notifications.find(
            (n: {
              channelName: string;
              isActive: boolean;
              id: string;
              callerId: string;
            }) => n.channelName === currentChannelName && n.isActive
          );

          if (activeCallNotification) {
            isCallInitiator =
              activeCallNotification.callerId === currentUser.id;

            // Only mark call as ended in DB if initiator is leaving
            if (isCallInitiator) {
              await fetch("/api/call-notifications", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: activeCallNotification.id,
                  isActive: false,
                  endedAt: new Date().toISOString(),
                }),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error ending call notification:", error);
      }

      // Only broadcast call-ended if initiator is leaving
      if (isCallInitiator) {
        await channel.publish({
          name: "call-ended",
          data: {
            channelName: currentChannelName,
            endedBy: currentUser.id,
          },
        });
      }
    }

    setIsVideoCallOpen(false);
    setCurrentChannelName("");
    setHasActiveCallWithPatient(false); // Reset active call flag
    checkActiveCall(); // Re-check for active calls
  };

  const handleCloseCall = async () => {
    await handleEndCall();
  };

  const getPatientName = () => {
    // If current user is patient, we're calling the doctor
    // If current user is doctor/nurse, we're calling the patient
    if (currentUser.role === "PATIENT") {
      return "Доктор";
    }
    return "Пациент";
  };

  const generateChannelName = () => {
    // Create a consistent channel name for the chat participants
    // Remove hyphens and limit length to stay within 64 bytes
    const cleanPatientId = patientId
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 20);
    const cleanUserId = currentUser.id
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 20);

    // Sort IDs to ensure same channel name regardless of who initiates
    const ids = [cleanPatientId, cleanUserId].sort();
    return `call_${ids[0]}_${ids[1]}`.substring(0, 60);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleInRussian = (role: string) => {
    switch (role.toUpperCase()) {
      case "DOCTOR":
        return "Доктор";
      case "NURSE":
        return "Медсестра";
      case "PATIENT":
        return "Пациент";
      default:
        return role;
    }
  };

  const messages = receivedMessages.map((message, index) => {
    const isCurrentUser = message.sender.id === currentUser.id;
    const roleColors = {
      DOCTOR: "bg-blue-500",
      NURSE: "bg-green-500",
      PATIENT: "bg-gray-500",
      SYSTEM: "bg-orange-500",
    };

    return (
      <div
        key={message.id || index}
        className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} mb-4`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-600">
            {message.sender.name} ({getRoleInRussian(message.sender.role)})
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div
          className={`px-4 py-2 rounded-lg max-w-[80%] ${
            isCurrentUser
              ? `ml-auto ${roleColors[message.sender.role]} text-white rounded-br-none`
              : "mr-auto bg-gray-200 text-gray-800 rounded-bl-none"
          }`}
        >
          {message.message}
        </div>
      </div>
    );
  });

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [receivedMessages]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Chat Header with Phone and Video Icons */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">
              Чат с пациентом
            </h3>
            {joinChannelName && (
              <p className="text-sm text-blue-600">Присоединение к звонку...</p>
            )}
            {hasActiveCallWithPatient && !isVideoCallOpen && (
              <div className="mt-3 mr-4 bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500 rounded-lg shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-900">
                      Активный звонок
                    </p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      У вас есть незавершенный звонок с этим пациентом
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        // Find and rejoin the active call
                        try {
                          const response = await fetch(
                            "/api/call-notifications?activeOnly=true"
                          );
                          if (response.ok) {
                            const notifications = await response.json();
                            const myCall = notifications.find(
                              (n: {
                                patientId: string;
                                callerId: string;
                                isActive: boolean;
                              }) =>
                                n.patientId === patientId &&
                                n.callerId === currentUser.id &&
                                n.isActive
                            );
                            if (myCall) {
                              setCurrentChannelName(myCall.channelName);
                              setIsAudioCall(!myCall.isVideoCall);
                              setIsVideoCallOpen(true);
                            }
                          }
                        } catch (error) {
                          console.error("Error rejoining call:", error);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Подключиться
                    </button>
                    <button
                      onClick={async () => {
                        // End the active call
                        try {
                          const response = await fetch(
                            "/api/call-notifications?activeOnly=true"
                          );
                          if (response.ok) {
                            const notifications = await response.json();
                            const myCall = notifications.find(
                              (n: {
                                patientId: string;
                                callerId: string;
                                isActive: boolean;
                                id: string;
                              }) =>
                                n.patientId === patientId &&
                                n.callerId === currentUser.id &&
                                n.isActive
                            );
                            if (myCall) {
                              // Mark call as ended
                              await fetch("/api/call-notifications", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id: myCall.id,
                                  isActive: false,
                                  endedAt: new Date().toISOString(),
                                }),
                              });

                              // Broadcast call ended
                              await channel.publish({
                                name: "call-ended",
                                data: {
                                  channelName: myCall.channelName,
                                  endedBy: currentUser.id,
                                },
                              });

                              setHasActiveCallWithPatient(false);
                            }
                          }
                        } catch (error) {
                          console.error("Error ending call:", error);
                          alert("Не удалось завершить звонок");
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      Завершить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 items-center">
            {/* Active Call Indicator */}
            {activeCall && !isVideoCallOpen && (
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700">
                  Идет {activeCall.isVideoCall ? "видео" : "аудио"} звонок
                </span>
                <button
                  onClick={handleJoinCall}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                >
                  Присоединиться
                </button>
              </div>
            )}

            {/* Only show call buttons for doctors and nurses, not patients */}
            {(currentUser.role === "DOCTOR" || currentUser.role === "NURSE") &&
              !activeCall && (
                <>
                  {/* Phone Icon */}
                  <button
                    type="button"
                    onClick={handleAudioCall}
                    disabled={hasActiveCallWithPatient || isCheckingCall}
                    className={`p-2 rounded-full transition-colors ${
                      hasActiveCallWithPatient || isCheckingCall
                        ? "bg-gray-300 cursor-not-allowed opacity-50"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    title={
                      hasActiveCallWithPatient
                        ? "У вас уже есть активный звонок с этим пациентом"
                        : "Голосовой звонок"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>

                  {/* Video Icon */}
                  <button
                    type="button"
                    onClick={handleVideoCall}
                    disabled={hasActiveCallWithPatient || isCheckingCall}
                    className={`p-2 rounded-full transition-colors ${
                      hasActiveCallWithPatient || isCheckingCall
                        ? "bg-gray-300 cursor-not-allowed opacity-50"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    title={
                      hasActiveCallWithPatient
                        ? "У вас уже есть активный звонок с этим пациентом"
                        : "Видео звонок"
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600"
                    >
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </button>
                </>
              )}
          </div>
        </div>
      </div>

      {/* Join Call Prompt - Show when navigated with join parameter */}
      {showJoinPrompt && joinCallDetails && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {joinCallDetails.isVideoCall ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  )}
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-800">
                  Входящий {joinCallDetails.isVideoCall ? "видео" : "аудио"}{" "}
                  звонок
                </p>
                <p className="text-sm text-green-600">
                  {joinCallDetails.callerName} приглашает вас присоединиться
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleJoinFromPrompt}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Присоединиться
              </button>
              <button
                onClick={() => setShowJoinPrompt(false)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="h-[500px] p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">{messages}</div>
        <div ref={messageEnd} />
      </div>

      {/* Text Input Area */}
      <form
        onSubmit={handleFormSubmission}
        className="p-4 border-t border-gray-200 flex-shrink-0"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputBox}
            value={messageText}
            placeholder="Введите сообщение..."
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-[45px] min-h-[45px]"
            rows={1}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg font-medium ${
              messageTextIsEmpty
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            disabled={messageTextIsEmpty}
          >
            Отправить
          </button>
        </div>
      </form>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={handleCloseCall}
        channelName={currentChannelName || generateChannelName()}
        currentUserId={currentUser.id}
        isVideoCall={!isAudioCall}
        recipientName={getPatientName()}
      />
    </div>
  );
};

export default ChatBox;
