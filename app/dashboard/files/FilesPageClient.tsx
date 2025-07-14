"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import S3FileUpload from "@/components/S3FileUpload";
import { FileWithUploader } from "@/types/files";
import { Eye, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FilesPageClientProps {
  patientId: string;
}

const FilesPageClient = ({ patientId }: FilesPageClientProps) => {
  const [files, setFiles] = useState<FileWithUploader[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/files?patientId=${patientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Ошибка при загрузке файлов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleFileUploaded = () => {
    fetchFiles(); // Refresh the list
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files?id=${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      toast.success("Файл успешно удален");
      fetchFiles(); // Refresh the list
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Ошибка при удалении файла");
    }
  };

  const handleViewFile = (fileUrl: string) => {
    window.open(fileUrl, "_blank");
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Медицинские файлы</h2>
          <S3FileUpload
            onFileUploaded={handleFileUploaded}
            patientId={patientId}
          />
        </div>
        <div className="text-center py-8">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Медицинские файлы</h2>
        <S3FileUpload
          onFileUploaded={handleFileUploaded}
          patientId={patientId}
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            У вас пока нет загруженных файлов
          </p>
          <p className="text-sm text-muted-foreground">
            Загрузите свои медицинские документы, чтобы они отобразились здесь
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Дата загрузки</TableHead>
                <TableHead>Тип файла</TableHead>
                <TableHead>Загрузил</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">{file.fileName}</TableCell>
                  <TableCell>{file.description || "—"}</TableCell>
                  <TableCell>
                    {format(new Date(file.createdAt), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-muted rounded-md">
                      {getFileExtension(file.fileName)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {file.uploadedBy?.fullName || "Неизвестно"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFile(file.fileUrl)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Просмотреть
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Удалить
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить файл?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Вы уверены, что хотите удалить файл &quot;
                              {file.fileName}&quot;? Это действие нельзя
                              отменить.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFile(file.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default FilesPageClient;
