"use client";

import React, { useEffect, useRef, useState } from "react";
import type { FC } from "react";
import { useChannel } from "ably/react";
import type * as Ably from "ably";

type Message = {
  id: string;
  message: string;
  sender: {
    id: string;
    name: string;
    role: "DOCTOR" | "NURSE" | "PATIENT";
  };
  createdAt: string;
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
  const messageTextIsEmpty = messageText.trim().length === 0;
  const inputBox = useRef<HTMLTextAreaElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);

  const { channel } = useChannel(
    `patient-${patientId}`,
    (message: Ably.Message) => {
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
    </div>
  );
};

export default ChatBox;
