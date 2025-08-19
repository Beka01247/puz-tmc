"use client";

import React from "react";

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerRole: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  callerName,
  callerRole,
  isVideoCall,
  onAccept,
  onDecline,
}) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        {/* Caller Avatar */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800">
            Входящий {isVideoCall ? "видео" : "аудио"} звонок
          </h3>
          <p className="text-gray-600 mt-2">
            {getRoleInRussian(callerRole)} {callerName}
          </p>
        </div>

        {/* Call Type Icon */}
        <div className="mb-6">
          {isVideoCall ? (
            <svg
              className="w-12 h-12 mx-auto text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg
              className="w-12 h-12 mx-auto text-green-500"
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

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Отклонить
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-full font-semibold transition-colors flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Принять
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
