import { useState, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/services/firebase";
import { imageDB } from "@/services/ImageDatabaseWriter";
import { persistentQueue } from "@/services/PersistentOfflineQueue";
import { useAuthSession } from "@/contexts/AuthContext";
import { generateSafeStoragePath } from "@/utils/fileUtils";
import type {
  UploadSource,
  UploadFallbackReason,
  UploadMetadata,
  UploadedImage,
} from "@/types";

interface UploadResult {
  url: string;
  storagePath: string | null;
  source: UploadSource;
  fallbackReason?: UploadFallbackReason;
  metadata?: UploadMetadata;
}

export type UploadStatus = "idle" | "uploading" | "completed" | "failed";

interface UseReliableFileUploadReturn {
  uploadFile: (
    file: File,
    pathGenerator: (fileName: string) => string,
    context?: UploadMetadata["context"]
  ) => Promise<UploadResult>;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: UploadStatus;
  error?: string;
  reset: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  card_image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/avif",
  ],
  card_audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
  ],
  profile: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ],
  pdf: ["application/pdf"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

/**
 * 実際のFirebase Storageへのアップロードを行う関数
 * (PersistentQueueから呼ばれる)
 */
const performFirebaseUpload = async (
  file: File,
  image: UploadedImage,
): Promise<UploadedImage> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Unauthenticated during background upload");

  // storagePathの再構築またはimageオブジェクトからの取得
  // image.storagePath は初期保存時に生成されているはず
  const storageRef = ref(storage, image.storagePath);

  // Upload
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise<UploadedImage>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {
        // Progress could be reported here if we had a global event bus
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            ...image,
            remoteUrl: downloadUrl as unknown, // Branded type cast
            status: "ready",
          });
        } catch (e) {
          reject(e);
        }
      },
    );
  });
};

export const useReliableFileUpload = (): UseReliableFileUploadReturn => {
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

  const validateFile = (file: File, context?: UploadMetadata["context"]) => {
    // Context processing
    let type = "card_image"; // Default type
    if (context) {
      if (typeof context === "string") {
        type = context;
      } else if (typeof context === "object" && "type" in context) {
        type = context.type;
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズが大きすぎます (最大10MB)`);
    }

    if (type && ALLOWED_MIME_TYPES[type]) {
      const allowed = ALLOWED_MIME_TYPES[type];
      if (
        !allowed.some(
          (t) =>
            file.type === t ||
            (t.includes("*") && file.type.startsWith(t.replace("*", ""))),
        )
      ) {
        const isGenericMatch = allowed.some((t) => {
          if (t === "image/*") return file.type.startsWith("image/");
          if (t === "audio/*") return file.type.startsWith("audio/");
          return false;
        });

        if (!isGenericMatch && !allowed.includes(file.type)) {
          throw new Error(`サポートされていないファイル形式です: ${file.type}`);
        }
      }
    }
  };

  const uploadFile = useCallback(
    async (
      file: File,
      pathGenerator: (fileName: string) => string,
      context?: UploadMetadata["context"]
    ): Promise<UploadResult> => {
      reset();

      if (!currentUser) {
        const e = "アップロードにはログインが必要です";
        setError(e);
        setUploadStatus("failed");
        throw new Error(e);
      }

      try {
        validateFile(file, context);
      } catch (validationError: unknown) {
        setError(validationError.message);
        setUploadStatus("failed");
        throw validationError;
      }

      setIsUploading(true);
      setUploadStatus("uploading");
      setUploadProgress(10); // Initial progress

      try {
        // 1. Generate Safe Path and ID
        const contextType =
          (context as unknown)?.type ||
          (typeof context === "string" ? context : "card_image");
        const forcedId =
          typeof context === "object" &&
          context !== null &&
          typeof (context as unknown).docId === "string"
            ? (context as unknown).docId.trim()
            : "";
        const { safeName, id: generatedId } = generateSafeStoragePath(
          file.name,
          contextType === "card_audio" ? "audio" : undefined,
        );
        const id = forcedId || generatedId;
        const storagePath = pathGenerator(safeName);

        // 2. Save to ImageDB (Optimistic Local Save)
        // returns { id, localUrl, ... }
        // Note: saveToIndexedDB returns void, so we construct savedImage first
        const storableImage: UploadedImage = {
          id,
          localUrl: URL.createObjectURL(file) as unknown,
          remoteUrl: null,
          status: "uploading",
          source: "local_fallback",
          storagePath,
          // Add other required fields
          contentType: file.type,
          size: file.size,
          sizeBytes: file.size,
          retryCount: 0,
        };

        await imageDB.saveToIndexedDB(storableImage);
        const savedImage = storableImage;

        // 3. Enqueue for Background Upload
        await persistentQueue.enqueue(savedImage, file);

        // 4. Trigger Queue Processing (Non-blocking)
        // We catch errors here to ensure the UI flow isn't interrupted by background sync failures
        persistentQueue.processQueue(performFirebaseUpload).catch((e) => {
          console.error("[ReliableUpload] Background sync trigger failed", e);
        });

        setUploadProgress(100);
        setUploadStatus("completed"); // UI status
        setIsUploading(false);

        // 5. Return Optimistic Result
        return {
          url: savedImage.localUrl || "", // Blob URL for immediate display
          storagePath: savedImage.storagePath || "",
          source: "local_fallback", // "Local" until synced
          metadata: {
            id: savedImage.id,
            storagePath: savedImage.storagePath || "",
            downloadUrl: savedImage.remoteUrl || undefined,
            uploadedAt: new Date(), // approximate
            status: "ready", // "Ready" from data perspective
            originalFilename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            context: context as unknown, // Cast to avoid complex union checks
            userId: currentUser.uid,
          },
        };
      } catch (error: unknown) {
        console.error("[ReliableUpload] Error:", error);
        setError(error.message);
        setUploadStatus("failed");
        setIsUploading(false);
        throw error;
      }
    },
    [currentUser, reset],
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






