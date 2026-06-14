"use client";
import * as React from "react";
import { generateReactHelpers } from "@uploadthing/react";
import { toast } from "sonner";
import { z } from "zod";

type UploadThingResponseFile<T = unknown> = {
  appUrl?: string;
  key: string;
  name: string;
  serverData?: T;
  size: number;
  type?: string;
  ufsUrl?: string;
  url?: string;
};
type UploadedFile<T = unknown> = {
  appUrl?: string;
  key: string;
  name: string;
  serverData?: T;
  size: number;
  type: string;
  url: string;
};
type UploadProgressValue = number | {
  progress?: number;
};
type UseUploadFileProps = {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
};

const UNKNOWN_ERROR_MESSAGE = "Something went wrong, please try again later.";
const { uploadFiles, useUploadThing: useUploadThingBase } = generateReactHelpers();

const getProgressValue = (progress: UploadProgressValue) => {
  if (typeof progress === "number") {
    return progress;
  }
  return progress.progress ?? 0;
};
const normalizeUploadedFile = <T,>(file: UploadThingResponseFile<T>): UploadedFile<T> => {
  const url = file.url ?? file.ufsUrl ?? file.appUrl ?? "";
  return {
    ...file,
    type: file.type ?? "",
    url,
  };
};
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
const useUploadThing = () => useUploadThingBase("editorUploader");
const useUploadFile = ({ onUploadComplete, onUploadError, ...props }: UseUploadFileProps = {}) => {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const handleUploadComplete = React.useCallback(
    (files: UploadThingResponseFile[]) => {
      const [file] = files;
      if (!file) {
        return;
      }
      const normalizedFile = normalizeUploadedFile(file);
      setUploadedFile(normalizedFile);
      onUploadComplete?.(normalizedFile);
    },
    [onUploadComplete],
  );
  const handleUploadError = React.useCallback(
    (error: unknown) => {
      const errorMessage = getErrorMessage(error);
      const message = errorMessage.length > 0 ? errorMessage : UNKNOWN_ERROR_MESSAGE;
      toast.error(message);
      onUploadError?.(error);
    },
    [onUploadError],
  );
  const { startUpload } = useUploadThingBase("editorUploader", {
    ...props,
    onClientUploadComplete: (files) => handleUploadComplete(files as UploadThingResponseFile[]),
    onUploadBegin: () => {
      setProgress(0);
    },
    onUploadError: handleUploadError,
    onUploadProgress: (currentProgress) => {
      setProgress(Math.min(getProgressValue(currentProgress as UploadProgressValue), 100));
    },
  });
  const uploadThing = React.useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadingFile(file);
      try {
        const files = await startUpload([file]);
        const [uploaded] = (files ?? []) as UploadThingResponseFile[];
        if (!uploaded) {
          const error = new Error("Upload did not return a file.");
          handleUploadError(error);
          return undefined;
        }
        const normalizedFile = normalizeUploadedFile(uploaded);
        setUploadedFile(normalizedFile);
        return normalizedFile;
      } catch (error) {
        handleUploadError(error);
        return undefined;
      } finally {
        setProgress(0);
        setIsUploading(false);
        setUploadingFile(undefined);
      }
    },
    [handleUploadError, startUpload],
  );
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
