import * as React from 'react';
import { generateReactHelpers } from '@uploadthing/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { createLocalMediaUrl, LOCAL_PLATE_MEDIA_USER_ID } from '@/registry/lib/local-media-url';
import { putImageBlob } from '@/services/imageFileStore';
import type { OurFileRouter } from '@/registry/lib/uploadthing';
import type { ClientUploadedFileData, UploadFilesOptions } from 'uploadthing/types';

export type UploadedFile<T = unknown> = ClientUploadedFileData<T>;

interface UseUploadFileProps extends Pick<UploadFilesOptions<OurFileRouter['editorUploader']>, 'headers' | 'onUploadBegin' | 'onUploadProgress' | 'skipPolling'> {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
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
}) as UploadedFile;

const createLocalUploadedFile = async (file: File): Promise<UploadedFile> => {
  const key = createAssetId();

  if (isImageFile(file)) {
    await putImageBlob(file, { assetId: key, userId: LOCAL_PLATE_MEDIA_USER_ID });
    return toUploadedFile(file, createLocalMediaUrl(key), key);
  }

  return toUploadedFile(file, createObjectUrl(file), key);
};

const simulateFallbackProgress = async (setProgress: React.Dispatch<React.SetStateAction<number>>) => {
  let progress = 0;

  while (progress < 100) {
    await new Promise((resolve) => setTimeout(resolve, FALLBACK_PROGRESS_DELAY_MS));
    progress += FALLBACK_PROGRESS_STEP;
    setProgress(Math.min(progress, 100));
  }
};

export function useUploadFile({ onUploadComplete, onUploadError, ...props }: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadThing(file: File) {
    setIsUploading(true);
    setUploadingFile(file);

    try {
      props.onUploadBegin?.({ file });
      const uploaded = await createLocalUploadedFile(file);

      await simulateFallbackProgress(setProgress);
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

export const { uploadFiles, useUploadThing } = generateReactHelpers<OurFileRouter>();

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
