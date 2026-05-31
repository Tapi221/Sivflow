import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from "firebase/firestore";
import * as Firestore from "firebase/firestore";
import { getDoc, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { getPullableCollectionRef, getUserSettingsRef, requireCloudSyncFirestore } from "./cloudSyncFirestoreRefs";
import { COLLECTION_BY_TYPE, getUpdatedAtMillis, PULLABLE_ENTITY_TYPES, type PullableEntityType, sanitizeSyncDataFromCloud } from "@/application/usecases/cloudSyncShared";
import type { SyncChange } from "@/services/interfaces/ISyncService";

type CloudSyncErrorLike = {
  code?: unknown;
  message?: unknown;
};

const PAGE_SIZE = 500;

const PULLABLE_ENTITY_LABEL_BY_TYPE: Record<PullableEntityType, string> = {
  card: "カード",
  folder: "フォルダー",
  cardSet: "カードセット",
  document: "ドキュメント",
  tag: "タグ",
  asset: "アセット",
};

const LOCALIZED_FIREBASE_ERROR_MESSAGE_BY_CODE: Record<string, string> = {
  cancelled: "クラウド同期がキャンセルされました。",
  "failed-precondition": "Firestoreのクエリ条件を満たせませんでした。必要なインデックスまたは設定を確認してください。",
  "permission-denied": "アクセス権限が不足しています。ログイン状態とFirestoreのセキュリティルールを確認してください。",
  "resource-exhausted": "Firestoreの利用上限に達しました。時間を置いて再実行してください。",
  unauthenticated: "認証情報を確認できませんでした。再ログインしてください。",
  unavailable: "Firestoreに接続できませんでした。ネットワーク状態を確認してください。",
};

const PERMISSION_DENIED_ERROR_MESSAGE = "Missing or insufficient permissions";

const getCloudSyncErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;

  const code = (error as CloudSyncErrorLike).code;
  return typeof code === "string" ? code : null;
};

const getCloudSyncErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;

  const message = (error as CloudSyncErrorLike).message;
  return typeof message === "string" ? message : null;
};

const getLocalizedCloudSyncErrorDetail = (error: unknown): string => {
  const code = getCloudSyncErrorCode(error);
  const normalizedCode = code?.replace(/^firestore\//, "");
  const localizedMessage = code
    ? LOCALIZED_FIREBASE_ERROR_MESSAGE_BY_CODE[code] ??
      (normalizedCode ? LOCALIZED_FIREBASE_ERROR_MESSAGE_BY_CODE[normalizedCode] : undefined)
    : undefined;

  if (localizedMessage) {
    return `${localizedMessage}（コード: ${code}）`;
  }

  const message = getCloudSyncErrorMessage(error);
  if (message?.includes(PERMISSION_DENIED_ERROR_MESSAGE)) {
    return LOCALIZED_FIREBASE_ERROR_MESSAGE_BY_CODE["permission-denied"];
  }

  if (code) {
    return `クラウド同期中にエラーが発生しました。（コード: ${code}）`;
  }

  return "クラウド同期中にエラーが発生しました。";
};

const getPullCollectionDiffErrorMessage = (
  type: PullableEntityType,
  error: unknown,
): string =>
  `[CloudSyncAdapter] ${PULLABLE_ENTITY_LABEL_BY_TYPE[type]}の差分取得に失敗しました: ${getLocalizedCloudSyncErrorDetail(error)}`;

const getPullDiffErrorMessage = (error: unknown): string =>
  `❌ [CloudSyncAdapter] 差分取得に失敗しました: ${getLocalizedCloudSyncErrorDetail(error)}`;

export const pullCloudSyncDiff = async (
  userId: string,
  since: number,
): Promise<{ changes: SyncChange[]; serverTime: number }> => {
  console.log("🔄 [CloudSyncAdapter] pullDiff START", {
    since,
    userId,
  });

  const changes: SyncChange[] = [];
  const firestore = requireCloudSyncFirestore();

  try {
    const sinceTimestamp = Timestamp.fromMillis(since);
    const startAfterValue = (Firestore as Record<string, unknown>).startAfter;
    const startAfterFn =
      typeof startAfterValue === "function"
        ? (startAfterValue as (
          snapshot: QueryDocumentSnapshot<DocumentData>,
        ) => QueryConstraint)
        : null;

    const pullCollectionDiff = async (type: PullableEntityType) => {
      try {
        const ref = getPullableCollectionRef(firestore, userId, type);
        let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
        let total = 0;

        while (true) {
          const constraints: QueryConstraint[] = [
            where("updatedAt", ">", sinceTimestamp),
            orderBy("updatedAt", "asc"),
            limit(PAGE_SIZE),
          ];

          if (startAfterFn && lastDoc) {
            constraints.splice(2, 0, startAfterFn(lastDoc));
          }

          const qy = query(ref, ...constraints);
          const snap = await getDocs(qy);
          total += snap.size;

          snap.forEach((d) => {
            changes.push({
              type,
              id: d.id,
              data: sanitizeSyncDataFromCloud(type, d.data()),
            });
          });

          if (!startAfterFn || snap.empty || snap.size < PAGE_SIZE) break;
          lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        }

        console.log(
          `[CloudSyncAdapter] Remote ${COLLECTION_BY_TYPE[type]} found: ${total}`,
        );
      } catch (error) {
        console.error(getPullCollectionDiffErrorMessage(type, error));
      }
    };

    for (const type of PULLABLE_ENTITY_TYPES) {
      await pullCollectionDiff(type);
    }

    const snap = await getDoc(getUserSettingsRef(firestore, userId));
    if (snap.exists()) {
      const data = sanitizeSyncDataFromCloud("userSetting", snap.data());
      const updatedAt =
        data && typeof data === "object"
          ? getUpdatedAtMillis((data as Record<string, unknown>).updatedAt)
          : 0;
      if (!since || updatedAt > since) {
        changes.push({ type: "userSetting", id: snap.id, data });
      }
    }

    console.log(
      `🔄 [CloudSyncAdapter] pullDiff SUCCESS. Total changes: ${changes.length}`,
    );
    return { changes, serverTime: Date.now() };
  } catch (error) {
    console.error(getPullDiffErrorMessage(error));
    throw error;
  }
};