"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Eye, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FileWithUploader {
  id: string;
  fileName: string;
  fileUrl: string;
  description: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    fullName: string;
  } | null;
}

interface FilesViewModalProps {
  title: string;
  onClose: () => void;
  patientId?: string;
}

const FilesViewModal = ({ title, onClose, patientId }: FilesViewModalProps) => {
  const [files, setFiles] = useState<FileWithUploader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilesData = async () => {
      try {
        const response = await fetch(`/api/files?patientId=${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch files");
        }
        const data = await response.json();

        // Filter files by description (УЗИ or Рентген)
        const filteredFiles = data.files.filter(
          (file: FileWithUploader) => file.description === title
        );

        setFiles(filteredFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
        toast.error("Ошибка при загрузке файлов");
      } finally {
        setLoading(false);
      }
    };

    fetchFilesData();
  }, [patientId, title]);

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files?id=${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      toast.success("Файл успешно удален");

      // Refresh files after deletion
      setLoading(true);
      const fetchResponse = await fetch(`/api/files?patientId=${patientId}`);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        const filteredFiles = data.files.filter(
          (file: FileWithUploader) => file.description === title
        );
        setFiles(filteredFiles);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Ошибка при удалении файла");
      setLoading(false);
    }
  };

  const handleViewFile = (fileUrl: string) => {
    window.open(fileUrl, "_blank");
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split(".").pop()?.toUpperCase() || "FILE";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Файлы {title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              У вас пока нет загруженных файлов {title.toLowerCase()}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Дата загрузки</TableHead>
                  <TableHead>Тип файла</TableHead>
                  <TableHead>Загрузил</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      {file.fileName}
                    </TableCell>
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
      </DialogContent>
    </Dialog>
  );
};

export default FilesViewModal;
