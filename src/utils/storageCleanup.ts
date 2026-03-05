import { firestoreDb, storage } from "@/services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import type { UploadMetadata } from "@/types";

/**
 * 24時間以上経過した、完了していないアップロード（failed, uploading, pending）をクリーンアップします。
 *
 * @param userId ユーザーID
 * @returns 削除結果（件数とエラーリスト）
 */
export const cleanupFailedUploads = async (userId: string) => {
  const result = {
    deleted: 0,
    errors: [] as { id: string; error: unknown }[],
  };

  try {
    // 24時間前の閾値
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayTimestamp = Timestamp.fromDate(yesterday);

    // アップロードメタデータのコレクション
    const uploadsRef = collection(firestoreDb, `users/${userId}/uploads`);

    // クエリ: 24時間より古く、かつステータスが ready 以外
    // Firestore では != 演算子が使えるが、インデックスの都合上、個別にチェックするか
    // あるいは simple get してクライアント側でフィルタリングする手法をとる
    const snapshot = await getDocs(uploadsRef);

    const staleUploads = snapshot.docs.filter((doc) => {
      const data = doc.data() as UploadMetadata;
      const uploadedAt = data.uploadedAt;

      // Timestamp か Date かを判定して比較
      const date =
        uploadedAt && typeof (uploadedAt as any).toDate === "function"
          ? (uploadedAt as any).toDate()
          : uploadedAt;

      const isOld = date && new Date(date) < yesterday;
      const isNotReady = data.status !== "ready";

      return isOld && isNotReady;
    });

    for (const uploadDoc of staleUploads) {
      const data = uploadDoc.data() as UploadMetadata;
      const docId = uploadDoc.id;

      try {
        // 1. Storage からファイルを削除（パスが存在する場合）
        if (data.storagePath) {
          const fileRef = ref(storage, data.storagePath);
          try {
            await deleteObject(fileRef);
          } catch (e: unknown) {
            // ファイルが既に存在しない場合は無視してメタデータ削除に進む
            if (e.code !== "storage/object-not-found") {
              throw e;
            }
          }
        }

        // 2. Firestore からメタデータを削除
        await deleteDoc(doc(firestoreDb, `users/${userId}/uploads`, docId));

        result.deleted++;
      } catch (err) {
        console.error(`Failed to cleanup upload ${docId}:`, err);
        result.errors.push({ id: docId, error: err });
      }
    }

    return result;
  } catch (error) {
    console.error("Cleanup process failed:", error);
    throw error;
  }
};
