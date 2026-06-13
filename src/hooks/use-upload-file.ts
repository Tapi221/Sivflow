import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

type UploadedFile<T = unknown> = {
  appUrl?: string;
  key: string;
  name: string;
  serverData?: T;
  size: number;
  type: string;
  url: string;
};
type UploadProgressEvent = {
  file: string;
  progress: number;
};
type UploadBeginEvent = {
  file: string;
};
type LocalUploadFilesOptions = {
  files: File[];
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  onUploadBegin?: (event: UploadBeginEvent) => void;
  onUploadProgress?: (event: UploadProgressEvent) => void;
  skipPolling?: boolean;
};
type UseUploadFileProps = Omit<LocalUploadFilesOptions, "files"> & {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
};

const UNKNOWN_ERROR_MESSAGE = "Something went wrong, please try again later.";
const LOCAL_UPLOAD_PROGRESS_STEPS = [20, 40, 60, 80, 100];
const LOCAL_UPLOAD_PROGRESS_INTERVAL_MS = 50;

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const createLocalUploadKey = (file: File) => {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `local-${randomId}-${file.name}`;
};
const createLocalUploadedFile = (file: File): UploadedFile => ({
  appUrl: `local://${file.name}`,
  key: createLocalUploadKey(file),
  name: file.name,
  size: file.size,
  type: file.type,
  url: URL.createObjectURL(file),
});
const uploadLocalFile = async (file: File, options: Pick<LocalUploadFilesOptions, "onUploadBegin" | "onUploadProgress">): Promise<UploadedFile> => {
  options.onUploadBegin?.({ file: file.name });
  for (const progress of LOCAL_UPLOAD_PROGRESS_STEPS) {
    await wait(LOCAL_UPLOAD_PROGRESS_INTERVAL_MS);
    options.onUploadProgress?.({ file: file.name, progress });
  }
  return createLocalUploadedFile(file);
};
const uploadFiles = async (_endpoint: "editorUploader", options: LocalUploadFilesOptions): Promise<UploadedFile[]> => {
  return Promise.all(options.files.map((file) => uploadLocalFile(file, options)));
};
const useUploadThing = () => ({
  startUpload: (files: File[]) => uploadFiles("editorUploader", { files }),
});
const getErrorMessage = (err: unknown) => {
  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message);
    return errors.join("\n");
  }
  if (err instanceof Error) {
    return err.message;
  }
  return UNKNOWN_ERROR_MESSAGE;
};
const useUploadFile = ({ onUploadComplete, onUploadError, ...props }: UseUploadFileProps = {}) => {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const uploadThing = async (file: File) => {
    setIsUploading(true);
    setUploadingFile(file);
    try {
      const res = await uploadFiles("editorUploader", {
        ...props,
        files: [file],
        onUploadProgress: ({ progress }) => {
          setProgress(Math.min(progress, 100));
        },
      });
      setUploadedFile(res[0]);
      onUploadComplete?.(res[0]);
      return res[0];
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const message = errorMessage.length > 0 ? errorMessage : UNKNOWN_ERROR_MESSAGE;
      toast.error(message);
      onUploadError?.(error);
      const localUploadedFile = createLocalUploadedFile(file);
      setProgress(100);
      setUploadedFile(localUploadedFile);
      return localUploadedFile;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  };
  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  };
};
const showErrorToast = (err: unknown) => {
  const errorMessage = getErrorMessage(err);
  return toast.error(errorMessage);
};

export { uploadFiles, useUploadThing, useUploadFile, getErrorMessage, showErrorToast };

export type { UploadedFile };
