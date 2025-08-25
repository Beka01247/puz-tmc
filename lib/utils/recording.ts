// Recording utility with better MP4 support
// Uses direct MP4 recording when supported, falls back to WebM

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
};

// Check browser capabilities for MP4 recording
const checkMP4Support = () => {
  const mp4Types = [
    "video/mp4",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.4D401E,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E",
  ];

  return mp4Types.find(
    (type) =>
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
  );
};

// Simple "conversion" that tries to provide MP4 when possible
export const convertWebMToMP4 = async (
  recordedBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; format: string }> => {
  if (onProgress) onProgress(50);

  // Check what format the blob actually is
  const isAlreadyMP4 = recordedBlob.type.includes("mp4");

  if (onProgress) onProgress(100);

  if (isAlreadyMP4) {
    console.log("Recording is already in MP4 format");
    return { blob: recordedBlob, format: "mp4" };
  } else {
    console.log("Recording is in WebM format - MP4 conversion not available");
    return { blob: recordedBlob, format: "webm" };
  }
};

// Create optimized recorder that prioritizes MP4 when supported
export const createOptimizedRecorder = (
  stream: MediaStream
): MediaRecorder | null => {
  try {
    // First try to get MP4 recording directly
    const supportedMP4 = checkMP4Support();

    if (supportedMP4) {
      console.log(`Recording directly in MP4 format: ${supportedMP4}`);
      return new MediaRecorder(stream, {
        mimeType: supportedMP4,
        videoBitsPerSecond: 3000000, // 3 Mbps for high quality
        audioBitsPerSecond: 128000, // 128 kbps for audio
      });
    }

    // Fallback to high-quality WebM formats
    const webmTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
    ];

    for (const mimeType of webmTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`Recording in WebM format: ${mimeType}`);
        return new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 3000000, // Higher bitrate for better quality
          audioBitsPerSecond: 128000,
        });
      }
    }

    // Last fallback
    console.log("Using default MediaRecorder settings");
    return new MediaRecorder(stream, {
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });
  } catch (error) {
    console.error("Error creating MediaRecorder:", error);
    return null;
  }
};
