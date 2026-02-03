import { Timestamp } from 'firebase/firestore';
import type { CodeBlockData } from './code-block';

/**
 * 基本設計思想に基づく、同期可能なエンティティのベース。
 * FirestoreのTimestampと互換性を持たせるため、Date | Timestampを許容。
 * 差分同期で必須となるフィールドを定義します。
 */
export interface BaseEntity {
  id: string; // 一意の識別子
  userId: string;
  createdAt: Date | Timestamp; // 作成日時
  updatedAt: Date | Timestamp; // 最終更新日時
  deviceId: string; // 最終編集端末の識別子
  isDeleted: boolean; // ソフトデリートフラグ
  hasSyncConflict?: boolean; // 競合発生フラグ
  conflictDescription?: string; // 競合内容の自然言語説明
}

export type UploadedImageStatus = 'pending' | 'uploading' | 'ready' | 'failed';
/** @deprecated Use UploadedImageStatus instead */
export type UploadState = 'pending' | 'inProgress' | 'completed' | 'failed';

export type UploadSource = 'cloud' | 'local_fallback';
export type UploadFallbackReason = 'timeout' | 'network_error' | 'permission_error' | 'unknown';

export type CardState = 'PRE-LEARN' | 'STABLE' | 'DECAYING' | 'FAILED' | 'RELEARN';

// Import branded types for type-safe URL handling
import type { BlobUrl, StorageUrl } from './branded';

/**
 * アップロードされた画像の型定義
 * 
 * 不変条件:
 * 1. localUrl は Blob URL のみ（data: 禁止）
 * 2. remoteUrl は Storage URL のみ（https: のみ）
 * 3. Base64 は一切保存してはならない
 */
export interface UploadedImage {
  id: string;
  localUrl?: BlobUrl | null;      // ✅ Blob URL のみ（一時プレビュー用）
  remoteUrl?: StorageUrl | null;   // ✅ Storage URL のみ（永続参照）
  thumbnailUrl?: StorageUrl | null; // サムネイルURL（Storage）
  remoteId?: string | null; // Storage上のパスやID
  status: UploadedImageStatus;
  contentType?: string | null;
  size?: number | null;
  sizeBytes?: number | null; // バイト単位のサイズ
  storagePath?: string | null;
  checksum?: string; // SHA-256 hash for integrity
  
  // New fields for robust sync
  /** @deprecated Use status instead */
  uploadState?: UploadState;
  lastAttempt?: Date | Timestamp | null;
  
  // New fields for reliability refactor
  source?: UploadSource; 
  fallbackReason?: UploadFallbackReason;
  progress?: number; // 0-100
  
  // Fields merged from types/upload.ts
  retryCount?: number;
  error?: string;
  uploadOrder?: number; // 順序保証用
}

export interface UploadedFile {
  id: string;
  name: string;
  remoteUrl: string;
  storagePath: string;
  contentType?: string | null;
  size?: number | null;
}

/**
 * 画像アップロードのメタデータ
 */
export interface UploadMetadata {
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  context: 'card_image' | 'profile' | 'memo' | 'card_audio' | 'pdf' | { type: string; [key: string]: any };
  userId: string;
  status: 'uploading' | 'ready' | 'failed' | 'pending';
  userAgent?: string;
  downloadUrl?: string; // 完了時に設定
  uploadedAt?: Date | Timestamp; // 完了時に設定
}

// ユーザー関連の型定義
export interface User {
  id: string; // ドキュメントID
  userId: string; // Firebase Auth の uid
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  authMethods: ('email' | 'google' | 'apple' | 'microsoft')[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp; // 差分同期のための最終更新日時
  deviceId: string; // 最終編集端末の識別子
  lastLoginAt: Date | Timestamp;
  isSuspended?: boolean;
  plan: 'free' | 'pro';
  baseQuotaMB: number;
  extraQuotaMB: number;
  usedQuotaMB: number;
}

// ユーザー設定
export interface UserSettings extends BaseEntity {
  displayName?: string;
  profileImage?: UploadedImage | null;
  weekStartDay: 'sunday' | 'monday';
  language: 'ja' | 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  levelColors: { [level: number]: string };
  notificationsEnabled: boolean;
  notificationMethods: ('browser' | 'email' | 'line')[];
  notificationTimes: { [dayOfWeek: number]: string };
  dayStartTime: string;
  soundEnabled: boolean;
  correctSound: boolean;
  incorrectSound: boolean;
  clickSound: boolean;
  soundVolume: number;
  levelDownBehavior: 'decrement' | 'maintain';
  autoResetDaysThreshold: number;
  completionLevelThreshold: number;
  swipeLoopMode: boolean;

  showReviewHard?: boolean;
  showReviewEasy?: boolean;
  autoCarryOver?: boolean;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;
  defaultPreviewEnabled?: boolean;
  autoDraftEnabled?: boolean;
  autoSaveEnabled?: boolean;
  duplicateToOpposite?: boolean;
}

// ユーザー統計
export interface UserStats extends BaseEntity {
  totalStudyCount: number;
  todayStudyCount: number;
  weeklyStudyCount: number;
  totalCorrectCount: number;
  totalIncorrectCount: number;
  accuracyRate: number;
  lastStudyAt: Date | Timestamp;
  totalThumbnailBytes?: number;
  totalHighResBytes?: number;
  totalStorageUsedBytes?: number;
}

/**
 * 同期状態を管理するためのローカルメタデータ。
 * これはFirestoreには保存せず、クライアントサイドのローカルDBに保存します。
 */
export interface SyncMetadata {
  userId: string;
  deviceId: string; // 端末固有ID
  deviceName?: string; // 端末名（ユーザー設定など）
  lastSyncTime: Date | Timestamp | null; // 全体的な最終同期日時
  lastHighResSync: Date | Timestamp | null; // 高解像度画像の最終同期日時
  lastSyncAttempt?: Date | Timestamp | null; // 最終同期試行日時
  isActive: boolean; // 端末アクティブ判定用
  
  // Phase 1: LocalDB Architecture Improvements
  clientSeq?: number; // クライアントシーケンス番号 (Single Source of Truth)
  needsSeqRepair?: boolean; // シーケンス番号の欠番検知フラグ
  safeMode?: boolean; // セーフモード（Read-Only）永続化フラグ
  queueHardLimit?: number; // キュー肥大化防止リミット

  // Device Management
  status?: 'active' | 'revoked'; // デバイスステータス (active: 有効, revoked: 無効化/論理削除)
  revokedAt?: Date | Timestamp | null; // 無効化された日時
}

/**
 * 端末ごとのメタデータ。
 * ローカルDBにのみ保存され、クラウドには同期されません。
 */
export interface DeviceMeta {
  deviceId: string;
  userId: string;
  lastSyncTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CardBlock = {
  id: string;
  type: 'text' | 'code' | 'image' | 'audio' | 'memo';
  content?: string;
  images?: UploadedImage[];
  audios?: Array<{ url: string; filename: string; order: number }>;
  code?: CodeBlockData;
  orderIndex: number;
};

export type Card = BaseEntity & {
  folderId: string;
  orderIndex: number;
  questionNumber: string;
  title?: string;
  isDraft: boolean;
  hasUncertainty: boolean;
  isBookmarked?: boolean;
  isCompleted: boolean;
  isSilent: boolean;
  isDeleted?: boolean;
  questionText: string;
  questionImages: UploadedImage[];
  questionAudios: Array<{ url: string; filename: string; order: number }>;
  questionCode?: CodeBlockData | null;
  questionMemo: string;
  questionMarked: string;
  answerText: string;
  answerImages: UploadedImage[];
  answerAudios: Array<{ url: string; filename: string; order: number }>;
  answerCode?: CodeBlockData | null;
  answerMemo: string;
  answerMarked: string;
  memoryStability: number;
  nextReviewDate: Date | Timestamp;
  lastReviewAt?: Date | Timestamp;
  lastSubjectiveScore?: number;
  recoveryRemaining?: number;
  lastReviewDelayDays?: number;
  currentLevel?: number;
  responseTimeMs?: number;
  uncertaintyMarkedDate?: Date | Timestamp;
  completedDate?: Date | Timestamp;
  tags?: string[];
  reviewCount?: number;
  state?: CardState;
  questionBlocks?: CardBlock[];
  answerBlocks?: CardBlock[];
  _rescueRaw?: any; // Recovery data persistence

}



export type Folder = BaseEntity & {
  parentFolderId?: string | null;
  folderId: string; // エイリアス: id と同じ
  folderName: string;
  folderColor?: string;
  orderIndex?: number;
  cloudSyncEnabled: boolean;
  memoText?: string;
  memoImages?: UploadedImage[];
  notePdfs?: UploadedFile[];
  isSilent?: boolean;
  isHidden?: boolean;
};
export interface CardRelation extends BaseEntity {
  fromCardId: string;
  toCardId: string;
  type: "premise" | "derivative" | "related";
  lineType: "straight" | "wave" | "zigzag" | "double";
  reasonTag?: string;
}

export interface MapNodePosition {
    cardId: string;
    x: number;
    y: number;
    pinned: boolean;
}

export interface ProjectMap extends BaseEntity {
    folderId: string;
    name: string;
    nodes: MapNodePosition[];
}

export * from './sync';
export * from './code-block';
export * from './media';
