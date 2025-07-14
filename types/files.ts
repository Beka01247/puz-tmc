export interface MedicalFile {
  id: string;
  fileName: string;
  fileUrl: string;
  description: string | null;
  patientId: string;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface FileWithUploader {
  id: string;
  fileName: string;
  fileUrl: string;
  description: string | null;
  patientId: string;
  createdAt: Date;
  uploadedBy: {
    id: string;
    fullName: string;
  } | null;
}
