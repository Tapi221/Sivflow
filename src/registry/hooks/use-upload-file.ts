import * as React from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { createLocalMediaUrl, LOCAL_PLATE_MEDIA_USER_ID } from '@/registry/lib/local-media-url';
import { putImageBlob } from '@/services/imageFileStore';

type UploadBeginEvent = {
  file: string;
};

type UploadProgressEvent = {
  progress: number;
};

export type UploadedFile<T = unknown> = {
  appUrl: string;
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
  customId?: string | null;
  serverData?: T;
};

interface UseUploadFileProps {
  headers?: HeadersInit;
  onUploadBegin?: (event: UploadBeginEvent) => void;
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
  onUploadProgress?: (event: UploadProgressEvent) => void;
  skipPolling?: boolean;
}

const LOCAL_UPLOAD_KEY_PREFIX = 'plate-local-upload';
const FALLBACK_PROGRESS_STEP = 8;
const FALLBACK_PROGRESS_DELAY_MS = 20;

const isImageFile = (file: File): boolean => file.type.startsWith('image/');

const createAssetId = (): string => `${LOCAL_UPLOAD_KEY_PREFIX}-${crypto.randomUUID()}`;

const createObjectUrl = (file: File): string => URL.createObjectURL(file);

const toUploadedFile = (file: File, url: string, key: string): UploadedFile => ({
  appUrl: url,
  key,
  name: file.name,
  size: file.size,
  type: file.type,
  url,
});

const createLocalUploadedFile = async (file: File): Promise<UploadedFile> => {
  const key = createAssetId();

  if (isImageFile(file)) {
    await putImageBlob(file, { assetId: key, userId: LOCAL_PLATE_MEDIA_USER_ID });
    return toUploadedFile(file, createLocalMediaUrl(key), key);
  }

  return toUploadedFile(file, createObjectUrl(file), key);
};

const simulateFallbackProgress = async (
  setProgress: React.Dispatch<React.SetStateAction<number>>,
  onUploadProgress: UseUploadFileProps['onUploadProgress'],
) => {
  let progress = 0;

  while (progress < 100) {
    await new Promise((resolve) => setTimeout(resolve, FALLBACK_PROGRESS_DELAY_MS));
    progress += FALLBACK_PROGRESS_STEP;
    const nextProgress = Math.min(progress, 100);
    setProgress(nextProgress);
    onUploadProgress?.({ progress: nextProgress });
  }
};

export function useUploadFile({ onUploadBegin, onUploadComplete, onUploadError, onUploadProgress }: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadThing(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      onUploadBegin?.({ file: file.name });
      const uploaded = await createLocalUploadedFile(file);

      await simulateFallbackProgress(setProgress, onUploadProgress);
      setUploadedFile(uploaded);
      onUploadComplete?.(uploaded);

      return uploaded;
    } catch (error) {
      onUploadError?.(error);
      throw error;
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown) {
  const unknownError = 'Something went wrong, please try again later.';

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message);

    return errors.join('\n');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return unknownError;
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err);

  return toast.error(errorMessage);
}
