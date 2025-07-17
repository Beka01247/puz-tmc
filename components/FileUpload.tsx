"use client";

import { IKImage, IKUpload } from "imagekitio-next";
import config from "@/lib/config";
import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

const {
  env: {
    imagekit: { urlEndpoint },
  },
} = config;

const authenticator = async () => {
  try {
    const response = await fetch("/api/auth/imagekit");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    const { signature, expire, token } = data;
    return { token, expire, signature };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`ImageKit authentication failed: ${errorMessage}`);
  }
};

interface Props {
  type: "image" | "file";
  accept: string;
  placeholder: string;
  folder: string;
  variant: "dark" | "light";
  onFileChange: (filePath: string) => void;
  value?: string;
}

const FileUpload = ({
  type,
  accept,
  placeholder,
  folder,
  variant,
  onFileChange,
  value,
}: Props) => {
  const ikUploadRef = useRef<HTMLInputElement>(null);
  const [filePath, setFilePath] = useState<string | null>(value ?? null);
  const [progress, setProgress] = useState(0);

  const styles = {
    button:
      variant === "dark"
        ? "bg-gray-800 border-gray-600"
        : "bg-white border-gray-200",
    placeholder: variant === "dark" ? "text-gray-400" : "text-gray-500",
    text: variant === "dark" ? "text-white" : "text-gray-800",
  };

  const onError = (error: Error | unknown) => {
    console.error("Upload error:", error);
    toast.error(
      `Не удалось загрузить ${type === "image" ? "изображение" : "файл"}. Попробуйте снова.`
    );
  };

  const onSuccess = (res: { filePath: string }) => {
    setFilePath(res.filePath);
    onFileChange(res.filePath);
    toast.success(`Файл ${res.filePath} успешно загружен!`);
  };

  const onValidate = (file: File) => {
    const maxSize = type === "image" ? 20 * 1024 * 1024 : 50 * 1024 * 1024; // 20MB for images, 50MB for files
    if (file.size > maxSize) {
      toast.error(
        `Файл слишком большой. Максимальный размер: ${maxSize / 1024 / 1024} МБ`
      );
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-2">
      <IKUpload
        ref={ikUploadRef}
        onError={onError}
        onSuccess={onSuccess}
        useUniqueFileName={true}
        validateFile={onValidate}
        onUploadStart={() => setProgress(0)}
        onUploadProgress={({ loaded, total }) => {
          setProgress(Math.round((loaded / total) * 100));
        }}
        folder={folder}
        accept={accept}
        className="hidden"
        authenticator={authenticator}
      />

      <button
        className={`flex items-center gap-2 p-2 rounded-md border ${styles.button}`}
        onClick={(e) => {
          e.preventDefault();
          ikUploadRef.current?.click();
        }}
      >
        <Image
          src="/icons/upload.svg"
          alt="upload-icon"
          width={20}
          height={20}
          className="object-contain"
        />
        <p className={`text-base ${styles.placeholder}`}>
          {filePath ? filePath.split("/").pop() : placeholder}
        </p>
      </button>

      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          >
            <span className="text-xs text-white">{progress}%</span>
          </div>
        </div>
      )}

      {filePath && type === "image" && (
        <IKImage
          src={filePath}
          alt="Uploaded image"
          width={500}
          height={300}
          className="rounded-md"
        />
      )}

      {filePath && type === "file" && (
        <a
          href={`${urlEndpoint}/${filePath}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm ${styles.text} hover:underline`}
        >
          Просмотреть файл
        </a>
      )}
    </div>
  );
};

export default FileUpload;
