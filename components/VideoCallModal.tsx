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
  participantInfo?: Record<
    string,
    {
      name: string;
      userType: string;
    }
  >;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  channelName,
  currentUserId,
  isVideoCall,
  recipientName,
  participantInfo = {},
}) => {
  const {
    callState,
    localVideoTrack,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    switchCamera,
    getRemoteVideoTrack,
    stopRecording,
    startScreenRecording,
  } = useAgoraCall();

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mainSpeakerRef = useRef<HTMLDivElement>(null);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeSpeakerUid, setActiveSpeakerUid] = useState<string | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<{
    userType: string;
    name: string;
  } | null>(null);

  // Fetch current user information when component mounts
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setCurrentUserInfo({
            userType: data.userInfo.userType,
            name: data.userInfo.fullName,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      }
    };

    if (isOpen) {
      fetchCurrentUserInfo();
    }
  }, [isOpen]);

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

  // Play remote videos (skip the active speaker as it plays in main view)
  useEffect(() => {
    callState.remoteUsers.forEach((uid) => {
      // Skip if this is the active speaker - it will be played in main view
      if (uid === activeSpeakerUid) return;

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
  }, [callState.remoteUsers, getRemoteVideoTrack, activeSpeakerUid]);

  // Set first remote user as active speaker when they join
  useEffect(() => {
    if (callState.remoteUsers.length > 0 && !activeSpeakerUid) {
      setActiveSpeakerUid(callState.remoteUsers[0]);
    }
  }, [callState.remoteUsers, activeSpeakerUid]);

  // Play video in main speaker view when active speaker changes
  useEffect(() => {
    if (activeSpeakerUid && mainSpeakerRef.current) {
      const remoteVideoTrack = getRemoteVideoTrack(activeSpeakerUid);
      if (remoteVideoTrack) {
        try {
          // Play the video in the main speaker view
          remoteVideoTrack.play(mainSpeakerRef.current);
        } catch (error) {
          // Ignore abort errors during switching
          if (
            error instanceof Error &&
            !error.message.includes("interrupted")
          ) {
            console.error("Error playing main speaker video:", error);
          }
        }
      }
    }
  }, [activeSpeakerUid, callState.remoteUsers, getRemoteVideoTrack]); // Re-run when remote users update (tracks published)

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

  const handleSelectSpeaker = (uid: string) => {
    setActiveSpeakerUid(uid);
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

  const getParticipantLabel = (uid: string) => {
    const participant = participantInfo[uid];

    // If we have explicit participant info, use it
    if (participant) {
      const userType = participant.userType;

      // Map user types to appropriate labels
      switch (userType) {
        case "PATIENT":
          return "Пациент";
        case "DOCTOR":
        case "DISTRICT_DOCTOR":
        case "SPECIALIST_DOCTOR":
          return "Лечащий врач";
        case "REGIONAL_ADMIN":
        case "CITY_ADMIN":
        case "DISTRICT_ADMIN":
          return "Врач консультант";
        case "NURSE":
          return "Медсестра";
        default:
          return (
            participant.name ||
            `Участник ${callState.remoteUsers.indexOf(uid) + 1}`
          );
      }
    }

    // Intelligent fallback based on current user and call context
    if (currentUserInfo) {
      const isCurrentUserPatient = currentUserInfo.userType === "PATIENT";
      const isCurrentUserDoctor = [
        "DOCTOR",
        "DISTRICT_DOCTOR",
        "SPECIALIST_DOCTOR",
      ].includes(currentUserInfo.userType);
      const isCurrentUserAdmin = [
        "REGIONAL_ADMIN",
        "CITY_ADMIN",
        "DISTRICT_ADMIN",
      ].includes(currentUserInfo.userType);

      // If current user is a patient, others are likely medical staff
      if (isCurrentUserPatient) {
        // In most patient calls, there will be one primary doctor and possibly admins
        if (callState.remoteUsers.indexOf(uid) === 0) {
          return "Лечащий врач";
        } else {
          return "Врач консультант";
        }
      }

      // If current user is a doctor/nurse, others could be patients or consulting doctors
      if (isCurrentUserDoctor || currentUserInfo.userType === "NURSE") {
        // Typically the first remote user would be the patient
        if (callState.remoteUsers.indexOf(uid) === 0) {
          return "Пациент";
        } else {
          return "Врач консультант";
        }
      }

      // If current user is admin, others are likely doctors and patients
      if (isCurrentUserAdmin) {
        // Try to infer from the call context and recipientName
        if (
          recipientName.toLowerCase().includes("пациент") ||
          callState.remoteUsers.indexOf(uid) === 0
        ) {
          return "Пациент";
        } else {
          return "Лечащий врач";
        }
      }
    }

    // Ultimate fallback
    return `Участник ${callState.remoteUsers.indexOf(uid) + 1}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 bg-gray-50">
          <div>
            <h3 className="text-base sm:text-lg font-semibold">
              {isVideoCall ? "Видео звонок" : "Аудио звонок"}
              {callState.isConnected && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({callState.remoteUsers.length + 1} участник
                  {callState.remoteUsers.length === 0
                    ? ""
                    : callState.remoteUsers.length === 1
                      ? "а"
                      : "ов"}
                  )
                </span>
              )}
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

        {/* Echo Prevention Tip Banner - Show when call is active */}
        {isCallStarted &&
          callState.isConnected &&
          callState.remoteUsers.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Совет:</span> Используйте
                  наушники для лучшего качества звука и предотвращения эха
                </p>
              </div>
              <button
                onClick={(e) => {
                  const banner = e.currentTarget.parentElement;
                  if (banner) banner.style.display = "none";
                }}
                className="flex-shrink-0 text-blue-400 hover:text-blue-600"
                aria-label="Закрыть"
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
              </button>
            </div>
          )}

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
            // Call in progress - Gallery view layout
            <>
              <div className="w-full h-full relative flex flex-col bg-gray-900">
                {/* Gallery Bar at Top - Thumbnails of all participants */}
                <div className="bg-gray-800 px-4 py-3 flex items-center justify-center gap-2 overflow-x-auto flex-shrink-0 border-b border-gray-700">
                  {/* Your video thumbnail */}
                  {isVideoCall && (
                    <div className="relative flex-shrink-0 group">
                      <div className="w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg relative">
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
                          <div className="absolute inset-0 flex items-center justify-center text-white text-xs bg-gray-700">
                            <svg
                              className="w-8 h-8"
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
                        )}
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-2 py-0.5 rounded">
                          Вы
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remote participants thumbnails */}
                  {callState.remoteUsers.map((uid) => (
                    <div
                      key={uid}
                      className="relative flex-shrink-0 group"
                      onClick={() => handleSelectSpeaker(uid)}
                    >
                      <div
                        className={`w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 shadow-lg relative transition-all cursor-pointer ${
                          activeSpeakerUid === uid
                            ? "border-green-500 ring-2 ring-green-400"
                            : "border-gray-600 hover:border-green-500"
                        }`}
                      >
                        <div
                          ref={(el) => {
                            if (el) {
                              const existingEl =
                                remoteVideoRefs.current.get(uid);
                              if (!existingEl || existingEl !== el) {
                                remoteVideoRefs.current.set(uid, el);
                                const remoteVideoTrack =
                                  getRemoteVideoTrack(uid);
                                if (remoteVideoTrack) {
                                  setTimeout(() => {
                                    remoteVideoTrack.play(el);
                                  }, 100);
                                }
                              }
                            }
                          }}
                          className="w-full h-full"
                          style={{ objectFit: "cover" }}
                        />
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-2 py-0.5 rounded truncate max-w-[110px]">
                          {getParticipantLabel(uid)}
                        </div>
                        {activeSpeakerUid === uid && (
                          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">
                            ●
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Speaker View - Large centered video */}
                <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
                  {callState.remoteUsers.length > 0 && activeSpeakerUid ? (
                    <div className="w-full h-full max-w-6xl max-h-full bg-gray-800 rounded-lg overflow-hidden shadow-2xl relative">
                      <div
                        ref={mainSpeakerRef}
                        className="w-full h-full"
                        style={{ objectFit: "contain" }}
                      />
                      <div className="absolute bottom-6 left-6 bg-black bg-opacity-80 text-white text-lg px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        {getParticipantLabel(activeSpeakerUid)}
                      </div>
                    </div>
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
          <div className="p-3 sm:p-4 bg-gray-100 flex justify-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Mute Audio */}
            <button
              onClick={toggleAudio}
              className={`p-2 sm:p-3 rounded-full ${
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
                className="w-5 h-5 sm:w-6 sm:h-6"
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
                  <>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                    <line
                      x1="3"
                      y1="3"
                      x2="21"
                      y2="21"
                      strokeLinecap="round"
                      strokeWidth={2.5}
                    />
                  </>
                )}
              </svg>
            </button>

            {/* Toggle Video (only for video calls) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`p-2 sm:p-3 rounded-full ${
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
                  className="w-5 h-5 sm:w-6 sm:h-6"
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
                    <>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                      <line
                        x1="3"
                        y1="3"
                        x2="21"
                        y2="21"
                        strokeLinecap="round"
                        strokeWidth={2.5}
                      />
                    </>
                  )}
                </svg>
              </button>
            )}

            {/* Switch Camera (only show when multiple cameras available) */}
            {isVideoCall &&
              callState.hasMultipleCameras &&
              callState.isVideoEnabled && (
                <button
                  onClick={switchCamera}
                  className="p-2 sm:p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors relative"
                  title="Переключить камеру"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {/* Camera type indicator */}
                  <div className="absolute -top-1 -right-1 bg-white text-blue-600 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                    {callState.isFrontCamera ? "П" : "З"}
                  </div>
                </button>
              )}

            {/* Recording Buttons */}
            <div className="flex space-x-1 sm:space-x-2">
              {/* Composition Recording Button */}
              {/* Screen Recording Button */}
              <button
                onClick={
                  callState.isRecording
                    ? handleStopRecording
                    : handleStartScreenRecording
                }
                className={`p-2 sm:p-3 rounded-full ${
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
                  className="w-5 h-5 sm:w-6 sm:h-6"
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
              className="p-2 sm:p-3 rounded-full bg-red-500 hover:bg-red-600 text-white"
              title="Завершить звонок"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallModal;
