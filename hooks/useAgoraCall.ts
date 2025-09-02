import { useState, useRef, useEffect, useCallback } from "react";
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

  // Composition recording state
  const composeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const composeCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawRAFRef = useRef<number | null>(null);
  const videoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(
    new Map()
  );
  const composedStreamRef = useRef<MediaStream | null>(null);
  const isComposedRecordingRef = useRef<boolean>(false);

  // Sync helper functions for composition recording
  const syncVideoElements = useCallback(() => {
    // Which video tracks do we currently want in the composition?
    const wanted = new Map<string, MediaStreamTrack>();

    if (localVideoTrack && callState.isVideoEnabled) {
      wanted.set("local", localVideoTrack.getMediaStreamTrack());
    }
    remoteVideoTracksRef.current.forEach((trk, uid) => {
      wanted.set(`remote:${uid}`, trk.getMediaStreamTrack());
    });

    // Remove stale videos
    videoElsRef.current.forEach((el, key) => {
      if (!wanted.has(key)) {
        try {
          el.pause();
        } catch {}
        el.srcObject = null;
        videoElsRef.current.delete(key);
      }
    });

    // Add new videos
    wanted.forEach((track, key) => {
      if (!videoElsRef.current.has(key)) {
        const v = document.createElement("video");
        v.playsInline = true;
        v.muted = true; // don't echo to speakers; we only need frames
        v.srcObject = new MediaStream([track]);
        v.onloadedmetadata = () => v.play().catch(() => {});
        videoElsRef.current.set(key, v);
      }
    });
  }, [localVideoTrack, callState.isVideoEnabled]);

  const syncAudioNodes = useCallback(() => {
    if (!audioCtxRef.current || !audioDestRef.current) return;

    const wanted = new Map<string, MediaStreamTrack>();
    if (localAudioTrack)
      wanted.set("local", localAudioTrack.getMediaStreamTrack());
    remoteAudioTracksRef.current.forEach((trk, uid) => {
      wanted.set(`remote:${uid}`, trk.getMediaStreamTrack());
    });

    // Remove stale nodes
    audioSourcesRef.current.forEach((node, key) => {
      if (!wanted.has(key)) {
        try {
          node.disconnect();
        } catch {}
        audioSourcesRef.current.delete(key);
      }
    });

    // Add new nodes
    wanted.forEach((track, key) => {
      if (!audioSourcesRef.current.has(key)) {
        const src = audioCtxRef.current!.createMediaStreamSource(
          new MediaStream([track])
        );
        src.connect(audioDestRef.current!);
        audioSourcesRef.current.set(key, src);
      }
    });
  }, [localAudioTrack]);

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

          // Resync composition recording if active
          if (isComposedRecordingRef.current) {
            syncVideoElements();
            syncAudioNodes();
          }
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

        // Resync composition recording if active
        if (isComposedRecordingRef.current) {
          syncVideoElements();
          syncAudioNodes();
        }
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

        // Resync composition recording if active
        if (isComposedRecordingRef.current) {
          syncVideoElements();
          syncAudioNodes();
        }
      });
    };

    initializeAgora();

    return () => {
      // Cleanup will be handled by the client state change
    };
  }, [syncVideoElements, syncAudioNodes]);

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
      if (!callState.isConnected) throw new Error("No active call to record");

      console.log("Starting composition recording...");

      // 1) Create canvas for video composition (720p by default)
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Cannot get 2D context");

      composeCanvasRef.current = canvas;
      composeCtxRef.current = ctx;

      // 2) Audio mixing graph
      const AudioCtx =
        typeof AudioContext !== "undefined"
          ? AudioContext
          : (
              window as typeof window & {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext;

      if (!AudioCtx) {
        throw new Error("AudioContext not supported");
      }

      const ac: AudioContext = new AudioCtx();
      const dest = ac.createMediaStreamDestination();
      audioCtxRef.current = ac;
      audioDestRef.current = dest;

      // 3) Prepare initial sources
      syncVideoElements();
      syncAudioNodes();

      // 4) Draw loop — simple responsive grid
      const draw = () => {
        if (!composeCanvasRef.current || !composeCtxRef.current) return;

        syncVideoElements(); // keep up with joins/leaves
        syncAudioNodes(); // audio nodes are cheap to check too

        const videos = Array.from(videoElsRef.current.values());
        const W = composeCanvasRef.current.width;
        const H = composeCanvasRef.current.height;

        // black background
        composeCtxRef.current.fillStyle = "#000";
        composeCtxRef.current.fillRect(0, 0, W, H);

        if (videos.length > 0) {
          // grid calc
          const cols = Math.ceil(Math.sqrt(videos.length));
          const rows = Math.ceil(videos.length / cols);
          const cellW = Math.floor(W / cols);
          const cellH = Math.floor(H / rows);

          videos.forEach((vid, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            try {
              composeCtxRef.current!.drawImage(
                vid,
                c * cellW,
                r * cellH,
                cellW,
                cellH
              );
            } catch {}
          });
        }

        drawRAFRef.current = requestAnimationFrame(draw);
      };
      draw();

      // 5) Build the final composed stream (canvas video + mixed audio)
      const canvasStream = canvas.captureStream(30); // 30 fps
      const final = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      composedStreamRef.current = final;

      // 6) Record it with your existing helper
      const mediaRecorder = createOptimizedRecorder(final);
      if (!mediaRecorder) throw new Error("Failed to create MediaRecorder");

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
      isComposedRecordingRef.current = true;

      setCallState((prev) => ({ ...prev, isRecording: true }));
      console.log("Composition recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
    }

    // stop draw loop
    if (drawRAFRef.current) {
      cancelAnimationFrame(drawRAFRef.current);
      drawRAFRef.current = null;
    }

    // release video helper elements
    videoElsRef.current.forEach((v) => {
      try {
        v.pause();
      } catch {}
      v.srcObject = null;
    });
    videoElsRef.current.clear();

    // stop composed stream tracks
    if (composedStreamRef.current) {
      composedStreamRef.current.getTracks().forEach((t) => t.stop());
      composedStreamRef.current = null;
    }

    // close audio context
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      audioDestRef.current = null;
      audioSourcesRef.current.clear();
    }

    composeCanvasRef.current = null;
    composeCtxRef.current = null;
    isComposedRecordingRef.current = false;

    setCallState((prev) => ({ ...prev, isRecording: false }));
    recordingStartTimeRef.current = null;
  };

  // Optional screen recording function for capturing the entire UI
  const startScreenRecording = async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 }, // user picks window/tab
        audio: true, // includes tab audio (Chrome) or system audio if allowed
      });

      const mediaRecorder = createOptimizedRecorder(display);
      if (!mediaRecorder) throw new Error("Failed to create MediaRecorder");

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || "video/webm",
        });
        await processRecording(recordedBlob);
      };

      mediaRecorder.start(1000);
      setCallState((p) => ({ ...p, isRecording: true }));

      // if user stops sharing via UI, reflect it
      display.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecording();
      });
    } catch (e) {
      console.error(e);
      alert("Screen recording was not started.");
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
    startScreenRecording,
  };
};
