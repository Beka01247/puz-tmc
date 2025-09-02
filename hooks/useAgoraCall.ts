import { useState, useRef, useEffect } from "react";
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import {
  convertWebMToMP4,
  downloadBlob,
  createOptimizedRecorder,
} from "@/lib/utils/recording";

// Client-side only AgoraRTC initialization
let AgoraRTC: typeof import("agora-rtc-sdk-ng").default | null = null;

const initAgoraRTC = async () => {
  if (typeof window !== "undefined" && !AgoraRTC) {
    const { default: agora } = await import("agora-rtc-sdk-ng");
    AgoraRTC = agora;
  }
  return AgoraRTC;
};

export interface CallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  remoteUsers: string[];
  isRecording: boolean;
  conversionProgress: number;
  isConverting: boolean;
}

export const useAgoraCall = () => {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] =
    useState<IMicrophoneAudioTrack | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isAudioEnabled: false,
    isVideoEnabled: false,
    remoteUsers: [],
    isRecording: false,
    conversionProgress: 0,
    isConverting: false,
  });

  // Recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<Date | null>(null);

  const remoteVideoTracksRef = useRef<Map<string, IRemoteVideoTrack>>(
    new Map()
  );
  const remoteAudioTracksRef = useRef<Map<string, IRemoteAudioTrack>>(
    new Map()
  );

  useEffect(() => {
    const initializeAgora = async () => {
      // Only initialize on client side
      const agora = await initAgoraRTC();
      if (!agora) {
        console.error("Failed to load AgoraRTC");
        return;
      }

      const agoraClient = agora.createClient({
        mode: "rtc",
        codec: "vp8",
      });

      setClient(agoraClient);

      // Set up event listeners
      agoraClient.on(
        "user-published",
        async (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
          console.log("User published:", user.uid, mediaType);
          await agoraClient.subscribe(user, mediaType);

          if (mediaType === "video") {
            console.log("Setting remote video track for user:", user.uid);
            remoteVideoTracksRef.current.set(
              user.uid.toString(),
              user.videoTrack!
            );
          } else if (mediaType === "audio") {
            console.log("Setting remote audio track for user:", user.uid);
            remoteAudioTracksRef.current.set(
              user.uid.toString(),
              user.audioTrack!
            );
            user.audioTrack!.play();
          }

          setCallState((prev) => ({
            ...prev,
            remoteUsers: Array.from(
              new Set([...prev.remoteUsers, user.uid.toString()])
            ),
          }));
        }
      );

      agoraClient.on("user-unpublished", (user: IAgoraRTCRemoteUser) => {
        remoteVideoTracksRef.current.delete(user.uid.toString());
        remoteAudioTracksRef.current.delete(user.uid.toString());

        setCallState((prev) => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter(
            (uid) => uid !== user.uid.toString()
          ),
        }));
      });

      agoraClient.on("user-left", (user: IAgoraRTCRemoteUser) => {
        remoteVideoTracksRef.current.delete(user.uid.toString());
        remoteAudioTracksRef.current.delete(user.uid.toString());

        setCallState((prev) => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter(
            (uid) => uid !== user.uid.toString()
          ),
        }));
      });
    };

    initializeAgora();

    return () => {
      // Cleanup will be handled by the client state change
    };
  }, []);

  const generateToken = async (
    channelName: string,
    uid: number,
    role: string
  ) => {
    try {
      const response = await fetch("/api/agora/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelName, uid, role }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate token");
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Error generating token:", error);
      throw error;
    }
  };

  const startCall = async (
    channelName: string,
    uid: number,
    isVideoCall: boolean
  ) => {
    if (!client) return;

    try {
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      if (!appId) {
        throw new Error("Agora App ID not configured");
      }

      console.log("Starting call:", { channelName, uid, isVideoCall });

      const token = await generateToken(channelName, uid, "publisher");

      // Join the channel
      await client.join(appId, channelName, token, uid);
      console.log("Joined channel successfully");

      // Create and publish audio track
      const agora = await initAgoraRTC();
      if (!agora) {
        throw new Error("AgoraRTC not loaded");
      }

      try {
        const audioTrack = await agora.createMicrophoneAudioTrack();
        setLocalAudioTrack(audioTrack);
        await client.publish(audioTrack);
        console.log("Published audio track");
      } catch (audioError) {
        console.error("Failed to create audio track:", audioError);
        throw new Error(
          "Audio device not available. Please check your microphone permissions."
        );
      }

      // Create and publish video track if it's a video call
      if (isVideoCall) {
        try {
          console.log("Creating video track...");
          const videoTrack = await agora.createCameraVideoTrack();
          console.log("Video track created:", videoTrack);
          setLocalVideoTrack(videoTrack);
          await client.publish(videoTrack);
          console.log("Published video track");
        } catch (videoError) {
          console.warn("Failed to create video track:", videoError);
          console.log("Continuing with audio-only call");
          // Continue with audio-only even if video fails
          setCallState((prev) => ({
            ...prev,
            isConnected: true,
            isAudioEnabled: true,
            isVideoEnabled: false, // Set to false since video failed
          }));
          console.log(
            "Call started successfully (audio-only due to camera issue)"
          );
          return; // Exit early to avoid setting video enabled
        }
      }

      // Set call state for successful call (with or without video)
      setCallState((prev) => ({
        ...prev,
        isConnected: true,
        isAudioEnabled: true,
        isVideoEnabled: isVideoCall,
      }));

      console.log("Call started successfully");
    } catch (error) {
      console.error("Error starting call:", error);
      throw error;
    }
  };

  const endCall = async () => {
    if (!client) return;

    try {
      // Stop and close local tracks
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }

      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }

      // Leave the channel
      await client.leave();

      setCallState({
        isConnected: false,
        isAudioEnabled: false,
        isVideoEnabled: false,
        remoteUsers: [],
        isRecording: false,
        conversionProgress: 0,
        isConverting: false,
      });

      // Clear remote tracks
      remoteVideoTracksRef.current.clear();
      remoteAudioTracksRef.current.clear();
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!callState.isAudioEnabled);
      setCallState((prev) => ({
        ...prev,
        isAudioEnabled: !prev.isAudioEnabled,
      }));
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!callState.isVideoEnabled);
      setCallState((prev) => ({
        ...prev,
        isVideoEnabled: !prev.isVideoEnabled,
      }));
    } else if (callState.isConnected && client) {
      // Start video if not already started
      try {
        const agora = await initAgoraRTC();
        if (!agora) return;

        const videoTrack = await agora.createCameraVideoTrack();
        setLocalVideoTrack(videoTrack);
        await client.publish(videoTrack);
        setCallState((prev) => ({ ...prev, isVideoEnabled: true }));
        console.log("Video enabled successfully");
      } catch (error) {
        console.warn("Failed to enable video:", error);
        alert(
          "Camera not available. Please check your camera permissions or ensure no other application is using the camera."
        );
      }
    }
  };

  const getRemoteVideoTrack = (uid: string) => {
    return remoteVideoTracksRef.current.get(uid);
  };

  const startRecording = async () => {
    try {
      if (!callState.isConnected) {
        throw new Error("No active call to record");
      }

      console.log("Starting recording...");

      // Create a new MediaStream to combine all tracks
      const combinedStream = new MediaStream();

      // Add local audio track
      if (localAudioTrack) {
        const localAudioMediaTrack = localAudioTrack.getMediaStreamTrack();
        combinedStream.addTrack(localAudioMediaTrack);
        console.log("Added local audio track");
      }

      // Add local video track
      if (localVideoTrack && callState.isVideoEnabled) {
        const localVideoMediaTrack = localVideoTrack.getMediaStreamTrack();
        combinedStream.addTrack(localVideoMediaTrack);
        console.log("Added local video track");
      }

      // Add remote audio tracks
      remoteAudioTracksRef.current.forEach((remoteAudioTrack, uid) => {
        const remoteAudioMediaTrack = remoteAudioTrack.getMediaStreamTrack();
        combinedStream.addTrack(remoteAudioMediaTrack);
        console.log("Added remote audio track for user:", uid);
      });

      // Add remote video tracks
      remoteVideoTracksRef.current.forEach((remoteVideoTrack, uid) => {
        const remoteVideoMediaTrack = remoteVideoTrack.getMediaStreamTrack();
        combinedStream.addTrack(remoteVideoMediaTrack);
        console.log("Added remote video track for user:", uid);
      });

      // Check if we have any tracks
      if (combinedStream.getTracks().length === 0) {
        throw new Error("No media tracks available for recording");
      }

      console.log(
        "Total tracks in combined stream:",
        combinedStream.getTracks().length
      );

      // Create optimized MediaRecorder
      const mediaRecorder = createOptimizedRecorder(combinedStream);
      if (!mediaRecorder) {
        throw new Error("Failed to create MediaRecorder");
      }

      console.log(
        "Using MediaRecorder with MIME type:",
        mediaRecorder.mimeType
      );

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("Data chunk received:", event.data.size, "bytes");
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing...");
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || "video/webm",
        });

        await processRecording(recordedBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      recordingStartTimeRef.current = new Date();

      setCallState((prev) => ({ ...prev, isRecording: true }));
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setCallState((prev) => ({ ...prev, isRecording: false }));
      recordingStartTimeRef.current = null;
    }
  };

  const processRecording = async (recordedBlob: Blob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    try {
      setCallState((prev) => ({
        ...prev,
        isConverting: true,
        conversionProgress: 0,
      }));

      console.log("Processing recording...");

      // Process the recording and get the format
      const result = await convertWebMToMP4(recordedBlob, (progress) => {
        setCallState((prev) => ({
          ...prev,
          conversionProgress: progress,
        }));
      });

      console.log(`Downloading recording as ${result.format.toUpperCase()}...`);
      downloadBlob(result.blob, `call-recording-${timestamp}.${result.format}`);
    } catch (error) {
      console.error("Error processing recording:", error);
      // Fallback to original blob
      console.log("Falling back to original format...");
      const fallbackExtension = recordedBlob.type.includes("mp4")
        ? "mp4"
        : "webm";
      downloadBlob(
        recordedBlob,
        `call-recording-${timestamp}.${fallbackExtension}`
      );
    } finally {
      setCallState((prev) => ({
        ...prev,
        isConverting: false,
        conversionProgress: 0,
      }));
    }
  };

  return {
    callState,
    localVideoTrack,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    getRemoteVideoTrack,
    startRecording,
    stopRecording,
  };
};
