import { useState, useRef, useEffect } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";

export interface CallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  remoteUsers: string[];
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
  });

  const remoteVideoTracksRef = useRef<Map<string, IRemoteVideoTrack>>(
    new Map()
  );
  const remoteAudioTracksRef = useRef<Map<string, IRemoteAudioTrack>>(
    new Map()
  );

  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8",
    });

    setClient(agoraClient);

    // Set up event listeners
    agoraClient.on("user-published", async (user, mediaType) => {
      console.log("User published:", user.uid, mediaType);
      await agoraClient.subscribe(user, mediaType);

      if (mediaType === "video") {
        console.log("Setting remote video track for user:", user.uid);
        remoteVideoTracksRef.current.set(user.uid.toString(), user.videoTrack!);
      } else if (mediaType === "audio") {
        console.log("Setting remote audio track for user:", user.uid);
        remoteAudioTracksRef.current.set(user.uid.toString(), user.audioTrack!);
        user.audioTrack!.play();
      }

      setCallState((prev) => ({
        ...prev,
        remoteUsers: Array.from(
          new Set([...prev.remoteUsers, user.uid.toString()])
        ),
      }));
    });

    agoraClient.on("user-unpublished", (user) => {
      remoteVideoTracksRef.current.delete(user.uid.toString());
      remoteAudioTracksRef.current.delete(user.uid.toString());

      setCallState((prev) => ({
        ...prev,
        remoteUsers: prev.remoteUsers.filter(
          (uid) => uid !== user.uid.toString()
        ),
      }));
    });

    agoraClient.on("user-left", (user) => {
      remoteVideoTracksRef.current.delete(user.uid.toString());
      remoteAudioTracksRef.current.delete(user.uid.toString());

      setCallState((prev) => ({
        ...prev,
        remoteUsers: prev.remoteUsers.filter(
          (uid) => uid !== user.uid.toString()
        ),
      }));
    });

    return () => {
      agoraClient.removeAllListeners();
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
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      await client.publish(audioTrack);
      console.log("Published audio track");

      // Create and publish video track if it's a video call
      if (isVideoCall) {
        console.log("Creating video track...");
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        console.log("Video track created:", videoTrack);
        setLocalVideoTrack(videoTrack);
        await client.publish(videoTrack);
        console.log("Published video track");
      }

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
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      setLocalVideoTrack(videoTrack);
      await client.publish(videoTrack);
      setCallState((prev) => ({ ...prev, isVideoEnabled: true }));
    }
  };

  const getRemoteVideoTrack = (uid: string) => {
    return remoteVideoTracksRef.current.get(uid);
  };

  return {
    callState,
    localVideoTrack,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    getRemoteVideoTrack,
  };
};
