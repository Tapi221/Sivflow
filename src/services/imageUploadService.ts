/**
 * プロフィール画像のFirebase Storage永続化サービス
 *
 * 責務:
 * - ファイルの検証
 * - Cloud Storage へのアップロード
 * - downloadURL を返す
 *
 * 制約:
 * - blob: URL は保存しない
 * - Base64 DataURL は保存しない
 * - ユーザーUID配下に保存（セキュリティルール準拠）
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/services/firebase";

export interface UploadProfileImageOptions {
  uid: string;
  file: File;
}

/**
 * プロフィール画像をFirebase Storageにアップロードする
 *
 * @param uid - ログイン中ユーザーのUID
 * @param file - アップロードするファイル
 * @returns downloadURL 文字列
 *
 * @throws エラー時は詳細メッセージを含むエラーを throw
 *
 * ⚠️ 注意:
 * - 呼び出し元で blob: URL を作成してはいけません
 * - この関数が返す downloadURL のみを settings に保存してください
 */
export async function uploadProfileImage({
  uid,
  file,
}: UploadProfileImageOptions): Promise<string> {
  if (!uid) {
    throw new Error("ユーザーIDが必要です");
  }

  if (!file) {
    throw new Error("ファイルが選択されていません");
  }

  // ファイル検証: サイズチェック（最大10MB）
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`ファイルサイズが大きすぎます（最大${MAX_SIZE_MB}MB）`);
  }

  // MIME型検証: 画像形式のみ許可
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `サポートされていないファイル形式です: ${file.type}。対応形式: ${ALLOWED_TYPES.join(", ")}`,
    );
  }

  // Storage パス: `users/{uid}/profile_${timestamp}.${ext}`
  // タイムスタンプを含めることでキャッシュ問題を回避
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const storagePath = `users/${uid}/profile_${Date.now()}.${ext}`;

  try {
    // アップロード実行
    const storageRef = ref(storage, storagePath);
    const uploadResult = await uploadBytes(storageRef, file, {
      cacheControl: "public,max-age=31536000",
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    // downloadURL を取得・返却
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    if (import.meta.env.DEV) {
      console.log("[ImageUploadService] ✅ Upload successful:", {
        downloadUrl: downloadUrl.substring(0, 60) + "...",
      });
    }

    return downloadUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ImageUploadService] ❌ Upload failed:", errorMessage);
    throw new Error(`画像のアップロードに失敗しました: ${errorMessage}`);
  }
}

