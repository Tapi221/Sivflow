/**
 * スナップショット型定義
 *
 * 設計原則：
 * - generationCounter: 正本判定に使用（単調増加）
 * - createdAt: 人間向けの説明用ラベル
 * - data: 完全コピー（差分禁止）
 */

import type { Card, Folder } from "@/types";

/** スナップショットのメタデータ */
export interface SnapshotMetadata {
  /** スキーマバージョン（マイグレーション用） */
  schemaVersion: number;

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
export interface ReviewLog {
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
export interface UserSettings {
  dailyGoal: number;
  notificationsEnabled: boolean;
}

/** スナップショットに含める画像アセット manifest */
export interface SnapshotAsset {
  assetId: string;
  storagePath: string;
  mime: string;
  naturalW: number | null;
  naturalH: number | null;
  createdAt: string;
  updatedAt: string;
}

/** スナップショットのデータ本体 */
export interface SnapshotData {
  cards: Card[];
  folders: Folder[];
  reviews: ReviewLog[];
  settings: UserSettings | null;
  assets: SnapshotAsset[];
}

/** アプリケーション全体のスナップショット */
export interface AppSnapshot {
  metadata: SnapshotMetadata;
  data: SnapshotData;
}

/** スナップショット比較結果 */
export interface SnapshotComparison {
  /** どちらが新しいか */
  newerSnapshot: "local" | "imported" | "same";

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
  };
}

/** 現在のスキーマバージョン */
export const CURRENT_SCHEMA_VERSION = 2;

/** アプリバージョン（package.jsonから取得すべきだが、ここでは固定） */
export const APP_VERSION = "1.0.0";
