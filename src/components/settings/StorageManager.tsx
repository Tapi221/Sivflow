import React, { useEffect, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Database,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "@/ui/icons";

import { useAuthSession } from "@/contexts/AuthContext";
import { getFirebaseStorage, getFirestoreDb } from "@/services/firebaseGateway";
import type { UploadMetadata } from "@/types";
import { formatBytes } from "@/utils/fileUtils";
import { toDateOrNull } from "@/utils/toMillis";

type StorageErrorLike = {
  code?: unknown;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "不明なエラーが発生しました";
};

const getStorageErrorCode = (error: unknown): string | null => {
  if (typeof error !== "object" || error === null) return null;
  const record = error as StorageErrorLike;
  return typeof record.code === "string" ? record.code : null;
};

const formatUploadDate = (value: unknown): string => {
  const date = toDateOrNull(value);
  return date ? date.toLocaleDateString() : "N/A";
};

export const StorageManager = () => {
  const { currentUser } = useAuthSession();
  const [uploads, setUploads] = useState<UploadMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestoreDb();
    if (!currentUser || !db) {
      if (!db) {
        console.warn("[StorageManager] firestoreDb is not initialized.");
        setLoading(false);
      }
      return;
    }

    const uploadsQuery = query(
      collection(db, `users/${currentUser.uid}/uploads`),
      orderBy("uploadedAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      uploadsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (docItem) =>
            ({
              id: docItem.id,
              ...docItem.data(),
            }) as UploadMetadata,
        );
        setUploads(docs);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Failed to fetch uploads", snapshotError);
        setError("ファイル情報の取得に失敗しました");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCleanup = async () => {
    if (
      !currentUser ||
      !confirm(
        "失敗した古いアップロード（24時間以上前）をクリーンアップしますか？",
      )
    )
      return;

    setLoading(true);
    try {
      const { cleanupFailedUploads } = await import("@/utils/storageCleanup");
      const result = await cleanupFailedUploads(currentUser.uid);
      if (result.deleted > 0) {
        alert(`${result.deleted} 件の不要なファイルを削除しました`);
      } else {
        alert("削除対象のファイルはありませんでした");
      }
      if (result.errors.length > 0) {
        console.warn("Cleanup errors:", result.errors);
      }
    } catch (cleanupError: unknown) {
      console.error("Cleanup failed", cleanupError);
      setError(getErrorMessage(cleanupError));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: UploadMetadata) => {
    if (
      !currentUser ||
      !confirm(
        "このファイルを完全に削除しますか？\n(使用されている場所からは削除されません)",
      )
    )
      return;

    setDeletingId(file.id);
    try {
      if (file.storagePath) {
        try {
          const storageRef = ref(getFirebaseStorage(), file.storagePath);
          await deleteObject(storageRef);
        } catch (storageError: unknown) {
          if (
            getStorageErrorCode(storageError) !== "storage/object-not-found"
          ) {
            console.warn("Storage delete failed", storageError);
          }
        }
      }

      const db = getFirestoreDb();
      if (db) {
        await deleteDoc(doc(db, `users/${currentUser.uid}/uploads`, file.id));
      } else {
        console.warn(
          "[StorageManager] firestoreDb not initialized. Metadata remains.",
        );
      }
    } catch (deleteError: unknown) {
      console.error("Delete failed", deleteError);
      setError("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const totalSize = uploads.reduce(
    (acc, curr) => acc + (curr.sizeBytes || 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-slate-700">
              クラウドストレージ使用量
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-900">
              {formatBytes(totalSize)}
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[10px] md:text-xs text-slate-400">
            ファイル数
          </div>
          <div className="font-bold text-slate-700 text-sm md:text-base">
            {uploads.length} 個
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm md:text-base">
            アップロード済み
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              最新 {uploads.length} 件
            </span>
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-200 hover:bg-amber-50 w-full sm:w-auto h-9 text-xs md:text-sm"
            onClick={handleCleanup}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            不要ファイルを整理
          </Button>
        </div>

        <ScrollArea className="h-[300px] w-full rounded-md border border-slate-100">
          <div className="p-4 space-y-2">
            {uploads.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                ファイルが見つかりません
              </div>
            ) : (
              uploads.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="shrink-0 w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-700 truncate max-w-[150px] md:max-w-[200px]">
                        {file.originalFilename}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatBytes(file.sizeBytes)}</span>
                        <span>•</span>
                        <span>{formatUploadDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const getFileIcon = (mimeType: string): React.ReactNode => {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="w-4 h-4" />;
  if (mimeType === "application/pdf") return <FileText className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};
