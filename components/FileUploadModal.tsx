"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, FileText } from "lucide-react";
import { toast } from "sonner";

interface FileUploadModalProps {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  patientId?: string;
}

const FileUploadModal = ({
  title,
  onClose,
  onSubmit,
  patientId,
}: FileUploadModalProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Файл слишком большой. Максимальный размер: 10 МБ");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // First, upload to S3
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", title);

      const uploadResponse = await fetch("/api/s3-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(50);

      // Then, save file info to database
      const saveResponse = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          description: title,
          patientId,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save file info");
      }

      setUploadProgress(100);
      toast.success(`${title} успешно загружен!`);
      onSubmit();
      onClose();

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Ошибка при загрузке файла");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузить {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Выберите файл</Label>

            <div className="flex items-center mt-1 space-x-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Обзор…
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedFile?.name || "Файл не выбран"}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dicom,.dcm"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
            />

            <p className="text-xs text-muted-foreground mt-1">
              Поддерживаемые форматы: PDF, DOC, DOCX, JPG, PNG, DICOM (макс. 10
              МБ)
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">{selectedFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeSelectedFile}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Загрузка...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Отмена
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Загрузка..." : "Загрузить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;
