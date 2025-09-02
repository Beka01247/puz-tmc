"use client";

import React, { useEffect, useRef, useState } from "react";
import type { FC } from "react";
import { useChannel } from "ably/react";
import type * as Ably from "ably";
import VideoCallModal from "./VideoCallModal";
import IncomingCallModal from "./IncomingCallModal";

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
  };
};

interface ChatBoxProps {
  patientId: string;
  currentUser: {
    id: string;
    name: string;
    role: "DOCTOR" | "NURSE" | "PATIENT";
  };
}

const ChatBox: FC<ChatBoxProps> = ({ patientId, currentUser }) => {
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
  const [incomingCall, setIncomingCall] = useState<{
    isOpen: boolean;
    callerName: string;
    callerRole: string;
    isVideoCall: boolean;
    channelName: string;
  }>({
    isOpen: false,
    callerName: "",
    callerRole: "",
    isVideoCall: false,
    channelName: "",
  });
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
      } else if (message.name === "call-invitation") {
        const callData = message.data as {
          channelName: string;
          isVideoCall: boolean;
          callerName: string;
          callerRole: string;
          callerId: string;
        };

        // Only show invitation if it's not from the current user
        if (callData.callerId !== currentUser.id) {
          // Create a special call invitation message
          const callInvitationMessage: Message = {
            id: `call-${Date.now()}`,
            message: `${callData.callerName} is inviting you to a ${callData.isVideoCall ? "video" : "audio"} call`,
            sender: {
              id: "system",
              name: "System",
              role: "SYSTEM",
            },
            createdAt: new Date().toISOString(),
            callInvitation: {
              channelName: callData.channelName,
              isVideoCall: callData.isVideoCall,
              callerName: callData.callerName,
              callerRole: callData.callerRole,
            },
          };

          setMessages((prevMessages) => {
            const history = prevMessages.slice(-199);
            return [...history, callInvitationMessage];
          });
        }
      } else if (message.name === "call-started") {
        const callData = message.data as {
          channelName: string;
          isVideoCall: boolean;
          startedBy: string;
          startedByName: string;
        };

        setActiveCall({
          channelName: callData.channelName,
          isVideoCall: callData.isVideoCall,
          participants: [callData.startedBy],
          startedBy: callData.startedByName,
          startedAt: new Date().toISOString(),
        });
      } else if (message.name === "call-ended") {
        setActiveCall(null);
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

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

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
    const channelName = generateChannelName();
    setCurrentChannelName(channelName);

    // Send call invitation via Ably
    await channel.publish({
      name: "call-invitation",
      data: {
        channelName,
        isVideoCall: false,
        callerName: currentUser.name,
        callerRole: currentUser.role,
        callerId: currentUser.id,
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

    setIsAudioCall(true);
    setIsVideoCallOpen(true);
  };

  const handleVideoCall = async () => {
    const channelName = generateChannelName();
    setCurrentChannelName(channelName);

    // Send call invitation via Ably
    await channel.publish({
      name: "call-invitation",
      data: {
        channelName,
        isVideoCall: true,
        callerName: currentUser.name,
        callerRole: currentUser.role,
        callerId: currentUser.id,
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

    setIsAudioCall(false);
    setIsVideoCallOpen(true);
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
      // Broadcast that user left the call
      await channel.publish({
        name: "participant-left",
        data: {
          userId: currentUser.id,
          channelName: currentChannelName,
        },
      });
    }

    setIsVideoCallOpen(false);
    setCurrentChannelName("");
  };

  const handleCloseCall = async () => {
    await handleEndCall();
  };

  const handleAcceptCall = () => {
    setCurrentChannelName(incomingCall.channelName);
    setIsAudioCall(!incomingCall.isVideoCall);
    setIsVideoCallOpen(true);
    setIncomingCall((prev) => ({ ...prev, isOpen: false }));
  };

  const handleDeclineCall = () => {
    setIncomingCall((prev) => ({ ...prev, isOpen: false }));
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

          {/* Call invitation buttons */}
          {message.callInvitation && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setCurrentChannelName(message.callInvitation!.channelName);
                  setIsAudioCall(!message.callInvitation!.isVideoCall);
                  setIsVideoCallOpen(true);
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {message.callInvitation.isVideoCall
                  ? "Присоединиться к видео"
                  : "Присоединиться к звонку"}
              </button>
              <button
                onClick={() => {
                  // Remove the call invitation message
                  setMessages((prev) =>
                    prev.filter((m) => m.id !== message.id)
                  );
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Отклонить
              </button>
            </div>
          )}
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
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Чат с пациентом
            </h3>
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
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Голосовой звонок"
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
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Видео звонок"
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

      {/* Chat Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
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

      {/* Incoming Call Modal */}
      <IncomingCallModal
        isOpen={incomingCall.isOpen}
        callerName={incomingCall.callerName}
        callerRole={incomingCall.callerRole}
        isVideoCall={incomingCall.isVideoCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </div>
  );
};

export default ChatBox;
