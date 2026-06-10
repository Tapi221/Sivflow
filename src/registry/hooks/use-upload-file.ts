import * as React from 'react';
import { generateReactHelpers } from '@uploadthing/react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { OurFileRouter } from '@/registry/lib/uploadthing';
import type { ClientUploadedFileData, UploadFilesOptions } from 'uploadthing/types';

export type UploadedFile<T = unknown> = ClientUploadedFileData<T>;

type UploadedFileCandidate = Partial<UploadedFile> & {
  appUrl?: string;
  ufsUrl?: string;
  url?: string;
};

interface UseUploadFileProps extends Pick<UploadFilesOptions<OurFileRouter['editorUploader']>, 'headers' | 'onUploadBegin' | 'onUploadProgress' | 'skipPolling'> {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

const LOCAL_UPLOAD_KEY_PREFIX = 'local-upload';
const FALLBACK_PROGRESS_STEP = 8;
const FALLBACK_PROGRESS_DELAY_MS = 20;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isImageFile = (file: File): boolean => file.type.startsWith('image/');

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
      return;
    }

    reject(new Error('Failed to read file as data URL.'));
  });
  reader.addEventListener('error', () => reject(reader.error ?? new Error('Failed to read file.')));
  reader.readAsDataURL(file);
});

const createLocalUrl = async (file: File): Promise<string> => isImageFile(file) ? readFileAsDataUrl(file) : URL.createObjectURL(file);

const getCandidateUrl = (candidate: UploadedFileCandidate | undefined): string => {
  if (isNonEmptyString(candidate?.url)) return candidate.url.trim();
  if (isNonEmptyString(candidate?.ufsUrl)) return candidate.ufsUrl.trim();
  if (isNonEmptyString(candidate?.appUrl)) return candidate.appUrl.trim();
  return '';
};

const toUploadedFile = (file: File, candidate: UploadedFileCandidate | undefined, url: string): UploadedFile => ({
  ...candidate,
  appUrl: candidate?.appUrl ?? url,
  key: candidate?.key ?? `${LOCAL_UPLOAD_KEY_PREFIX}-${crypto.randomUUID()}`,
  name: candidate?.name ?? file.name,
  size: candidate?.size ?? file.size,
  type: candidate?.type ?? file.type,
  url,
}) as UploadedFile;

const normalizeUploadedFile = async (file: File, candidate: UploadedFileCandidate | undefined): Promise<UploadedFile> => {
  const candidateUrl = getCandidateUrl(candidate);
  const url = candidateUrl || await createLocalUrl(file);
  return toUploadedFile(file, candidate, url);
};

const createFallbackUploadedFile = async (file: File): Promise<UploadedFile> => {
  const url = await createLocalUrl(file);
  return toUploadedFile(file, undefined, url);
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
      const res = await uploadFiles('editorUploader', {
        ...props,
        files: [file],
        onUploadProgress: ({ progress }) => {
          setProgress(Math.min(progress, 100));
        },
      });
      const uploaded = await normalizeUploadedFile(file, res[0] as UploadedFileCandidate | undefined);

      setUploadedFile(uploaded);
      onUploadComplete?.(uploaded);

      return uploaded;
    } catch (error) {
      onUploadError?.(error);
      const fallbackUploadedFile = await createFallbackUploadedFile(file);

      await simulateFallbackProgress(setProgress);
      setUploadedFile(fallbackUploadedFile);

      return fallbackUploadedFile;
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
