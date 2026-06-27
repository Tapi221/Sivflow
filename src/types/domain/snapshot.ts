/**
 * スナップショット型定義
 *
 * 設計原則：
 * - generationCounter: 正本判定に使用（単調増加）
 * - createdAt: 人間向けの説明用ラベル
 * - data: 完全コピー（差分禁止）
 */

import type { Card, Folder } from "@/types";
import type { CardSet } from "./cardSet";



/** スナップショットのメタデータ */
interface SnapshotMetadata {
  /** スキーマバージョン（マイグレーション用） */ schemaVersion: number;

  /** 世代カウンター（単調増加、正本判定に使用） */
  generationCounter: number;

  /** 作成日時（ISO 8601形式、説明用ラベル） */
  createdAt: string;

  /** アプリバージョン */
  appVersion: string;

  /** ユーザーID */
  userId: string;
}
/** 学習ログ */
interface ReviewLog {
  id: string;
  cardId: string;
  folderId: string;
  reviewedAt: string;
  subjectiveScore: 0 | 1 | 2 | 3;
  responseTimeSeconds: number;
  stabilityBefore: number;
  stabilityAfter: number;
}
/** ユーザー設定 */
interface UserSettings {
  dailyGoal: number;
  notificationsEnabled: boolean;
}
/** スナップショットに含める画像アセット manifest */
interface SnapshotAsset {
  assetId: string;
  storagePath: string;
  mime: string;
  naturalW: number | null;
  naturalH: number | null;
  createdAt: string;
  updatedAt: string;
}
/** スナップショットのデータ本体 */
interface SnapshotData {
  cards: Card[];
  cardSets: CardSet[];
  folders: Folder[];
  reviews: ReviewLog[];
  settings: UserSettings | null;
  assets: SnapshotAsset[];
}
/** アプリケーション全体のスナップショット */
interface AppSnapshot {
  metadata: SnapshotMetadata;
  data: SnapshotData;
}
/** スナップショット比較結果 */
interface SnapshotComparison {
  /** どちらが新しいか */ newerSnapshot: "local" | "imported" | "same";

  /** ローカルの世代 */
  localGeneration: number;

  /** インポートの世代 */
  importedGeneration: number;

  /** データの差分サマリ */
  diff: {
    cardsAdded: number;
    cardsRemoved: number;
    cardsModified: number;
    foldersAdded: number;
    foldersRemoved: number;
    cardSetsAdded: number;
    cardSetsRemoved: number;
    assetsAdded: number;
    assetsRemoved: number;
  };
}



/** 現在のスキーマバージョン */
const CURRENT_SCHEMA_VERSION = 3;
/** アプリバージョン（package.jsonから取得すべきだが、ここでは固定） */
const APP_VERSION = "1.0.0";



export { CURRENT_SCHEMA_VERSION, APP_VERSION };


export type { SnapshotMetadata, ReviewLog, UserSettings, SnapshotAsset, SnapshotData, AppSnapshot, SnapshotComparison };
