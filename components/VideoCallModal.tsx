"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAgoraCall } from "@/hooks/useAgoraCall";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  currentUserId: string;
  isVideoCall: boolean;
  recipientName: string;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  channelName,
  currentUserId,
  isVideoCall,
  recipientName,
}) => {
  const {
    callState,
    localVideoTrack,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    getRemoteVideoTrack,
    stopRecording,
    startScreenRecording,
  } = useAgoraCall();

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState.isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState.isConnected]);

  // Play local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      try {
        localVideoTrack.play(localVideoRef.current);
      } catch (error) {
        console.error("Error playing local video:", error);
      }
    }
  }, [localVideoTrack]);

  // Play remote videos
  useEffect(() => {
    callState.remoteUsers.forEach((uid) => {
      const remoteVideoTrack = getRemoteVideoTrack(uid);
      const remoteVideoElement = remoteVideoRefs.current.get(uid);

      if (remoteVideoTrack && remoteVideoElement) {
        try {
          remoteVideoTrack.play(remoteVideoElement);
        } catch (error) {
          console.error("Error playing remote video:", error);
        }
      }
    });
  }, [callState.remoteUsers, getRemoteVideoTrack]);

  const handleStartCall = async () => {
    try {
      const uid = parseInt(currentUserId) || Math.floor(Math.random() * 10000);
      await startCall(channelName, uid, isVideoCall);
      setIsCallStarted(true);
    } catch (error) {
      console.error("Failed to start call:", error);
      alert("Не удалось начать звонок. Проверьте подключение к интернету.");
    }
  };

  const handleEndCall = async () => {
    // Stop recording if active
    if (callState.isRecording) {
      stopRecording();
    }
    await endCall();
    setIsCallStarted(false);
    setCallDuration(0);
    onClose();
  };

  const handleStartScreenRecording = async () => {
    try {
      await startScreenRecording();
    } catch (error) {
      console.error("Failed to start screen recording:", error);
      alert("Не удалось начать запись экрана. Проверьте разрешения браузера.");
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">
              {isVideoCall ? "Видео звонок" : "Аудио звонок"} с {recipientName}
            </h3>
            {callState.isConnected && (
              <p className="text-sm text-gray-600">
                Длительность: {formatDuration(callDuration)}
              </p>
            )}
          </div>
          <button
            onClick={handleEndCall}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 bg-gray-900 relative">
          {!isCallStarted ? (
            // Pre-call screen
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="mb-4">
                  <div className="w-20 h-20 mx-auto bg-gray-600 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-10 h-10"
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
                  <h4 className="text-xl font-semibold">{recipientName}</h4>
                  <p className="text-gray-400">
                    {isVideoCall ? "Видео звонок" : "Аудио звонок"}
                  </p>
                </div>
                <button
                  onClick={handleStartCall}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-semibold"
                >
                  Начать звонок
                </button>
              </div>
            </div>
          ) : (
            // Call in progress - Multi-participant layout
            <>
              {/* Multi-participant video grid */}
              <div className="w-full h-full relative flex flex-col">
                {/* Your video at the top center */}
                {isVideoCall && (
                  <div className="flex justify-center p-2">
                    <div className="w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-blue-400 shadow-lg relative">
                      <div
                        ref={(el) => {
                          if (el && localVideoTrack) {
                            localVideoRef.current = el;
                            setTimeout(() => {
                              localVideoTrack.play(el);
                            }, 100);
                          }
                        }}
                        className="w-full h-full"
                        style={{ objectFit: "cover" }}
                      />
                      {!localVideoTrack && (
                        <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-gray-700">
                          Камера выключена
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Вы
                      </div>
                    </div>
                  </div>
                )}

                {/* Remote participants area */}
                <div className="flex-1 flex items-center justify-center p-4">
                  {callState.remoteUsers.length > 0 ? (
                    <>
                      {callState.remoteUsers.length === 1 ? (
                        // Single participant - large centered video
                        <div className="w-full h-full max-w-3xl max-h-full bg-gray-800 rounded-lg overflow-hidden border-2 border-green-400 shadow-lg relative">
                          <div
                            ref={(el) => {
                              if (el) {
                                const uid = callState.remoteUsers[0];
                                remoteVideoRefs.current.set(uid, el);
                                const remoteVideoTrack =
                                  getRemoteVideoTrack(uid);
                                if (remoteVideoTrack) {
                                  setTimeout(() => {
                                    remoteVideoTrack.play(el);
                                  }, 100);
                                }
                              }
                            }}
                            className="w-full h-full"
                            style={{ objectFit: "cover" }}
                          />
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            {recipientName}
                          </div>
                        </div>
                      ) : (
                        // Multiple participants - grid layout
                        <div
                          className={`flex gap-4 flex-wrap justify-center items-center ${
                            callState.remoteUsers.length === 2
                              ? "w-full max-w-4xl"
                              : "w-full"
                          }`}
                        >
                          {callState.remoteUsers.map((uid, index) => (
                            <div
                              key={uid}
                              className={`bg-gray-800 rounded-lg overflow-hidden border-2 border-green-400 shadow-lg relative ${
                                callState.remoteUsers.length === 2
                                  ? "w-80 h-60" // Two participants - medium side by side
                                  : "w-64 h-48" // Multiple participants - smaller
                              }`}
                            >
                              <div
                                ref={(el) => {
                                  if (el) {
                                    remoteVideoRefs.current.set(uid, el);
                                    const remoteVideoTrack =
                                      getRemoteVideoTrack(uid);
                                    if (remoteVideoTrack) {
                                      setTimeout(() => {
                                        remoteVideoTrack.play(el);
                                      }, 100);
                                    }
                                  }
                                }}
                                className="w-full h-full"
                                style={{ objectFit: "cover" }}
                              />
                              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                Участник {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-white">
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto bg-gray-600 rounded-full flex items-center justify-center mb-4">
                          <svg
                            className="w-16 h-16"
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
                        <p className="text-xl">Ожидание подключения...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio-only indicator for current user */}
                {!isVideoCall && (
                  <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-4 border-2 border-white shadow-lg">
                    <div className="text-white text-center">
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-xs">Аудио</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        {isCallStarted && (
          <div className="p-4 bg-gray-100 flex justify-center space-x-4">
            {/* Mute Audio */}
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full ${
                callState.isAudioEnabled
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              title={
                callState.isAudioEnabled
                  ? "Выключить микрофон"
                  : "Включить микрофон"
              }
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {callState.isAudioEnabled ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                )}
              </svg>
            </button>

            {/* Toggle Video (only for video calls) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${
                  callState.isVideoEnabled
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
                title={
                  callState.isVideoEnabled
                    ? "Выключить камеру"
                    : "Включить камеру"
                }
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {callState.isVideoEnabled ? (
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
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-4.95-4.95m0 0L5.636 5.636"
                    />
                  )}
                </svg>
              </button>
            )}

            {/* Recording Buttons */}
            <div className="flex space-x-2">
              {/* Composition Recording Button */}
              {/* Screen Recording Button */}
              <button
                onClick={
                  callState.isRecording
                    ? handleStopRecording
                    : handleStartScreenRecording
                }
                className={`p-3 rounded-full ${
                  callState.isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-blue-200 hover:bg-blue-300 text-blue-700"
                }`}
                title={
                  callState.isRecording
                    ? "Остановить запись экрана"
                    : "Записать экран"
                }
                disabled={callState.isConverting}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {callState.isRecording ? (
                    /* Stop Recording - Stop Square */
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      rx="2"
                      ry="2"
                      fill="currentColor"
                      stroke="none"
                    />
                  ) : (
                    /* Screen Recording Icon */
                    <>
                      <rect
                        x="2"
                        y="3"
                        width="20"
                        height="14"
                        rx="2"
                        ry="2"
                        strokeWidth={2}
                      />
                      <circle
                        cx="12"
                        cy="10"
                        r="3"
                        fill="currentColor"
                        stroke="none"
                      />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Processing Progress Indicator */}
            {callState.isConverting && (
              <div className="flex items-center space-x-2 bg-blue-100 px-3 py-2 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700">
                  Обработка записи: {callState.conversionProgress}%
                </span>
              </div>
            )}

            {/* Recording Status */}
            {callState.isRecording && (
              <div className="flex items-center space-x-2 bg-red-100 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-700">Идет запись...</span>
              </div>
            )}

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white"
              title="Завершить звонок"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17l-1.5 1.5-2.222-2.222 1.5-1.5L8.5 13l1.758-1.758m6.364 6.364L21 21"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;
