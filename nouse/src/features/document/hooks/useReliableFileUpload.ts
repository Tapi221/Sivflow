import { useCallback, useState } from "react";
import { auth, storage } from "@platform/firebase/client";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { imageDB } from "@/services/ImageDatabaseWriter";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import type { UploadedImage, UploadFallbackReason, UploadMetadata, UploadSource } from "@/types";
import type { BlobUrl, StorageUrl } from "@/types/core/branded";
import { generateSafeStoragePath } from "@/utils/fileUtils";



interface UploadResult {
  url: string;
  storagePath: string | null;
  source: UploadSource;
  fallbackReason?: UploadFallbackReason;
  metadata?: UploadMetadata;
}
type UploadStatus = "idle" | "uploading" | "completed" | "failed";
interface UseReliableFileUploadReturn {
  uploadFile: (
    file: File,
    pathGenerator: (fileName: string) => string,
    context?: UploadMetadata["context"],
    onProgress?: (progress: number) => void,
  ) => Promise<UploadResult>;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: UploadStatus;
  error?: string;
  reset: () => void;
}
type UploadKind = "card_image" | "card_audio" | "pdf";
type UploadValidationRule = {
  label: string;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileSize: number;
  defaultMimeType?: string;
};



const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DOCUMENT_MAX_FILE_SIZE = 50 * 1024 * 1024;
const UPLOAD_VALIDATION_RULES: Record<UploadKind, UploadValidationRule> = {
  card_image: {
    label: "画像",
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/avif",
    ],
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".heic",
      ".heif",
      ".avif",
    ],
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
  },
  card_audio: {
    label: "音声",
    allowedMimeTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/m4a",
      "audio/mp4",
      "audio/x-m4a",
    ],
    allowedExtensions: [".mp3", ".wav", ".ogg", ".m4a", ".mp4"],
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
  },
  pdf: {
    label: "PDF",
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: [".pdf"],
    maxFileSize: DOCUMENT_MAX_FILE_SIZE,
    defaultMimeType: "application/pdf",
  },
};



const isContextObject = (
  value: UploadMetadata["context"] | undefined,
): value is Extract<UploadMetadata["context"], { type: string; }> =>
  typeof value === "object" && value !== null && "type" in value;
const toUploadKind = (value: string): UploadKind => {
  if (value === "card_audio" || value === "pdf") return value;
  return "card_image";
};
const resolveUploadType = (context?: UploadMetadata["context"]): UploadKind => {
  if (!context) return "card_image";
  if (typeof context === "string") return toUploadKind(context);
  if (isContextObject(context)) return toUploadKind(context.type);
  return "card_image";
};
const getForcedIdFromContext = (
  context?: UploadMetadata["context"],
): string => {
  if (!isContextObject(context)) return "";
  return typeof context.docId === "string" ? context.docId.trim() : "";
};
const getFileExtension = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return normalized.slice(dotIndex);
};
const matchesMimeType = (
  fileType: string,
  allowedMimeType: string,
): boolean => {
  if (!fileType) return false;
  if (allowedMimeType.endsWith("/*")) {
    const prefix = allowedMimeType.slice(0, allowedMimeType.length - 1);
    return fileType.startsWith(prefix);
  }
  return fileType === allowedMimeType;
};
const getValidationRule = (type: UploadKind): UploadValidationRule =>
  UPLOAD_VALIDATION_RULES[type];
const getSafeErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown; }).message === "string"
  ) {
    return (error as { message: string; }).message;
  }
  return fallback;
};
const normalizeMimeType = (file: File, type: UploadKind): string => {
  const trimmed = file.type.trim();
  if (trimmed) return trimmed;
  return getValidationRule(type).defaultMimeType ?? "application/octet-stream";
};
const toBlobUrl = (url: string): BlobUrl => url as BlobUrl;
const toStorageUrl = (url: string): StorageUrl => url as StorageUrl;
const performFirebaseUpload = async (
  file: File,
  image: UploadedImage,
): Promise<UploadedImage> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Unauthenticated during background upload");
  if (!image.storagePath) throw new Error("Storage path is missing");

  const storageRef = ref(storage, image.storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<UploadedImage>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {},
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            ...image,
            remoteUrl: toStorageUrl(downloadUrl),
            status: "ready",
          });
        } catch (error) {
          reject(error);
        }
      },
    );
  });
};
const useReliableFileUpload = (): UseReliableFileUploadReturn => {
  const { currentUser } = useAuthSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  const reset = useCallback(() => {
    setUploadStatus("idle");
    setUploadProgress(0);
    setError(undefined);
    setIsUploading(false);
  }, []);

  const validateFile = useCallback(
    (file: File, context?: UploadMetadata["context"]) => {
      const type = resolveUploadType(context);
      const rule = getValidationRule(type);

      if (file.size > rule.maxFileSize) {
        const maxMb = Math.floor(rule.maxFileSize / 1024 / 1024);
        throw new Error(
          `${rule.label}のファイルサイズが大きすぎます (最大${maxMb}MB)`,
        );
      }

      const extension = getFileExtension(file.name);
      const mimeType = file.type.trim();

      const mimeMatches =
        mimeType.length > 0 &&
        rule.allowedMimeTypes.some((allowedMimeType) =>
          matchesMimeType(mimeType, allowedMimeType),
        );

      const extensionMatches =
        extension.length > 0 && rule.allowedExtensions.includes(extension);

      if (!mimeMatches && !extensionMatches) {
        throw new Error(
          `サポートされていない${rule.label}ファイルです: ${file.name}`,
        );
      }
    },
    [],
  );

  const uploadFile = useCallback(
    async (
      file: File,
      pathGenerator: (fileName: string) => string,
      context?: UploadMetadata["context"],
      onProgress?: (progress: number) => void,
    ): Promise<UploadResult> => {
      reset();

      if (!currentUser) {
        const message = "アップロードにはログインが必要です";
        setError(message);
        setUploadStatus("failed");
        throw new Error(message);
      }

      try {
        validateFile(file, context);
      } catch (validationError: unknown) {
        const message = getSafeErrorMessage(
          validationError,
          "ファイル検証に失敗しました",
        );
        setError(message);
        setUploadStatus("failed");
        throw validationError instanceof Error
          ? validationError
          : new Error(message);
      }

      setIsUploading(true);
      setUploadStatus("uploading");
      setUploadProgress(10);
      onProgress?.(10);

      try {
        const contextType = resolveUploadType(context);
        const forcedId = getForcedIdFromContext(context);
        const { id: generatedId } = generateSafeStoragePath(
          file.name,
          contextType === "card_audio" ? "audio" : undefined,
        );
        const id = forcedId || generatedId;
        const storagePath = pathGenerator(file.name);
        const normalizedMimeType = normalizeMimeType(file, contextType);

        const storableImage: UploadedImage = {
          id,
          localUrl: toBlobUrl(URL.createObjectURL(file)),
          remoteUrl: null,
          status: "uploading",
          source: "local_fallback",
          storagePath,
          contentType: normalizedMimeType,
          size: file.size,
          sizeBytes: file.size,
          retryCount: 0,
        };

        await imageDB.saveToIndexedDB(storableImage);
        const savedImage = storableImage;

        await persistentQueue.enqueue(savedImage, file);

        persistentQueue
          .processQueue(performFirebaseUpload)
          .catch((queueError) => {
            console.error(
              "[ReliableUpload] Background sync trigger failed",
              queueError,
            );
          });

        setUploadProgress(100);
        setUploadStatus("completed");
        setIsUploading(false);
        onProgress?.(100);

        return {
          url: savedImage.localUrl ?? "",
          storagePath: savedImage.storagePath ?? "",
          source: "local_fallback",
          metadata: {
            id: savedImage.id,
            storagePath: savedImage.storagePath ?? "",
            downloadUrl: savedImage.remoteUrl || undefined,
            uploadedAt: new Date(),
            status: "ready",
            originalFilename: file.name,
            mimeType: normalizedMimeType,
            sizeBytes: file.size,
            context: context ?? contextType,
            userId: currentUser.uid,
          },
        };
      } catch (uploadError: unknown) {
        const message = getSafeErrorMessage(
          uploadError,
          "アップロードに失敗しました",
        );
        console.error("[ReliableUpload] Error:", uploadError);
        setError(message);
        setUploadStatus("failed");
        setIsUploading(false);
        throw uploadError instanceof Error ? uploadError : new Error(message);
      }
    },
    [currentUser, reset, validateFile],
  );

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    uploadStatus,
    error,
    reset,
  };
};



export { useReliableFileUpload };


export type { UploadStatus };
