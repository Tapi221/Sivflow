import { Timestamp } from 'firebase/firestore';

import type { BlobUrl, StorageUrl } from './branded';
import './ide-shims.d'; // Ensure IDE picks up shim types
import type { CodeBlockData } from './code-block';
import type { InkDocument } from '@/Components/ink/inkTypes';

/**
 * 同期可能なエンティティの共通ベース。
 * Firestore Timestamp と Date の両方を許容して、ローカル/クラウド往復を壊しにくくする。
 */
export interface BaseEntity {
  id: string; // 一意ID（ドキュメントID相当）
  userId: string; // 所有ユーザー
  deviceId: string; // 最終編集端末
  createdAt: Date | Timestamp; // 作成日時
  updatedAt: Date | Timestamp; // 最終更新日時（差分同期の基準）
  isDeleted: boolean; // ソフトデリート

  hasSyncConflict?: boolean; // 競合発生フラグ
  conflictDescription?: string; // 競合内容の説明
}

/** 画像アップロードの状態（現行） */
export type UploadedImageStatus = 'pending' | 'uploading' | 'ready' | 'failed';

/** @deprecated Use UploadedImageStatus instead */
export type UploadState = 'pending' | 'inProgress' | 'completed' | 'failed';

export type UploadSource = 'cloud' | 'local_fallback';
export type UploadFallbackReason = 'timeout' | 'network_error' | 'permission_error' | 'unknown';

export type CardState = 'PRE-LEARN' | 'STABLE' | 'DECAYING' | 'FAILED' | 'RELEARN';

/**
 * プロフィール画像スキーマ（Settings保存用）
 * 
 * ⚠️ 仕様:
 * - remoteUrl のみを保存（blob: URL は禁止）
 * - updatedAt は UNIX タイムスタンプ（ミリ秒）
 */
export interface ProfileImage {
  remoteUrl: string | null;        // Firebase Storage downloadURL
  updatedAt: number;                // UNIX タイムスタンプ
}

/**
 * 主観評価スコア（復習UIの4段階）
 * reviewUtils の SubjectiveScore と同じ意味だが、型定義レイヤーに依存を持ち込まないためここで定義する。
 */
export type SubjectiveScoreValue = 0 | 1 | 2 | 3;

/**
 * アップロードされた画像の型定義
 *
 * 不変条件:
 * 1. localUrl は Blob URL のみ（data: 禁止）
 * 2. remoteUrl は Storage URL のみ（https: のみ）
 * 3. Base64 は保存しない
 *
 * ⚠️ プロフィール画像用: localUrl を settings に保存してはいけません
 * settings には remoteUrl のみを保存してください（blob: URL は永続化防止）
 */
export interface UploadedImage {
  id: string;

  // URL（型で縛って事故を減らす）
  localUrl?: BlobUrl | null; // 一時プレビュー用（Blob URL のみ）。settings に保存しない！
  remoteUrl?: StorageUrl | null; // 永続参照（Storage URL のみ）
  thumbnailUrl?: StorageUrl | null; // サムネイルURL（Storage）

  // Storage 側の識別情報
  remoteId?: string | null; // Storage上のパスやID
  storagePath?: string | null;

  // 状態
  status: UploadedImageStatus;
  progress?: number; // 0-100

  // メタ
  contentType?: string | null;
  size?: number | null; // 互換フィールド（単位が曖昧なので残ってる感ある）
  sizeBytes?: number | null; // バイト単位のサイズ
  checksum?: string; // SHA-256 hash for integrity

  // リトライ・失敗情報
  retryCount?: number;
  error?: string;
  uploadOrder?: number; // 順序保証用

  // 互換/移行中フィールド
  /** @deprecated Use status instead */
  uploadState?: UploadState;
  lastAttempt?: Date | Timestamp | null;

  // 信頼性リファクタ用
  source?: UploadSource;
  fallbackReason?: UploadFallbackReason;

  // プロフィール画像用メタデータ
  /** 最後に更新された時刻（settings保存時の参考用） */
  updatedAt?: Date | Timestamp | null;
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
 * 画像/音声/PDF 等のアップロードを追跡するメタデータ
 */
export interface UploadMetadata {
  id: string;
  userId: string;

  originalFilename: string;
  storagePath: string;

  mimeType: string;
  sizeBytes: number;

  context:
    | 'card_image'
    | 'profile'
    | 'memo'
    | 'card_audio'
    | 'pdf'
    | 'pptx'
    | { type: string; [key: string]: any };

  status: 'pending' | 'uploading' | 'ready' | 'failed';

  userAgent?: string;

  // 完了時に設定
  downloadUrl?: string;
  uploadedAt?: Date | Timestamp;
}

/**
 * ユーザー（Firestore上のユーザードキュメント想定）
 * ※ BaseEntity にしないのは、既存設計/スキーマ都合っぽいのでそのまま。
 */
export interface User {
  id: string; // ドキュメントID
  userId: string; // Firebase Auth の uid

  email: string;
  displayName?: string;
  profileImageUrl?: string;

  authMethods: ('email' | 'google' | 'apple' | 'microsoft')[];

  plan: 'free' | 'pro';
  isSuspended?: boolean;

  baseQuotaMB: number;
  extraQuotaMB: number;
  usedQuotaMB: number;

  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  deviceId: string;

  lastLoginAt: Date | Timestamp;
}

/**
 * ユーザー設定（同期対象）
 */
export interface UserSettings extends BaseEntity {
  // 表示/プロフィール
  displayName?: string;
  profileImage?: ProfileImage | null;

  // ロケール/テーマ
  weekStartDay: 'sunday' | 'monday';
  language: 'ja' | 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  levelColors: { [level: number]: string };

  // 通知
  notificationsEnabled: boolean;
  notificationMethods: ('browser' | 'email' | 'line')[];
  notificationTimes: { [dayOfWeek: number]: string };

  // 学習日の基準
  dayStartTime: string;

  // サウンド
  soundEnabled: boolean;
  correctSound: boolean;
  incorrectSound: boolean;
  clickSound: boolean;
  soundVolume: number;

  // 学習ロジック系
  levelDownBehavior: 'decrement' | 'maintain';
  autoResetDaysThreshold: number;
  completionLevelThreshold: number;
  swipeLoopMode: boolean;

  // UI/挙動のトグル群（後方互換っぽい）
  showReviewHard?: boolean;
  showReviewEasy?: boolean;
  autoCarryOver?: boolean;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;

  defaultPreviewEnabled?: boolean;
  autoDraftEnabled?: boolean;
  autoSaveEnabled?: boolean;
  duplicateToOpposite?: boolean;

  // カード編集画面の高さ設定（端末間で同期）
  cardEditorHeightPx?: number | null;

  editorBlockSettings?: BlockConfig[];
  blockButtonShowLabel?: boolean;
}

/**
 * ユーザー統計（同期対象）
 */
export interface UserStats extends BaseEntity {
  // 学習回数
  totalStudyCount: number;
  todayStudyCount: number;
  weeklyStudyCount: number;

  // 正誤
  totalCorrectCount: number;
  totalIncorrectCount: number;
  accuracyRate: number;

  // 最終学習
  lastStudyAt: Date | Timestamp;

  // ストレージ
  totalThumbnailBytes?: number;
  totalHighResBytes?: number;
  totalStorageUsedBytes?: number;
}

/**
 * 同期状態を管理するローカルメタデータ。
 * Firestore には保存せず、クライアントのローカルDBに保存する。
 */
export interface SyncMetadata {
  userId: string;

  // 端末識別
  deviceId: string;
  deviceName?: string;

  // 同期時刻
  lastSyncTime: Date | Timestamp | null;
  lastHighResSync: Date | Timestamp | null;
  lastSyncAttempt?: Date | Timestamp | null;

  // 端末状態
  isActive: boolean;
  status?: 'active' | 'revoked';
  revokedAt?: Date | Timestamp | null;

  // Phase 1: LocalDB Architecture Improvements
  clientSeq?: number; // クライアントシーケンス番号（Single Source of Truth）
  needsSeqRepair?: boolean; // 欠番検知
  safeMode?: boolean; // セーフモード（Read-Only）永続化
  queueHardLimit?: number; // キュー肥大化防止
}

/**
 * 端末ごとのメタデータ（ローカルDBのみ）
 */
export interface DeviceMeta {
  deviceId: string;
  userId: string;

  lastSyncTime: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * 参照リンクブロック（カード内）
 */
export type ReferenceBlockData = {
  url: string;
  name?: string;
};

/**
 * ブロック表示設定（ユーザー設定で並び替え/表示切替する用）
 */
export interface BlockConfig {
  id: string; // type と同一
  type: 'text' | 'code' | 'image' | 'audio' | 'reference' | 'math' | 'markdown';

  label: string; // 表示名
  isVisible: boolean;
  orderIndex: number;
}

/**
 * 数式ブロックのデータ構造
 */
export type MathBlockData = {
  latex: string; // KaTeX準拠のLaTeX文字列
  displayMode: 'block' | 'inline';
  note?: string; // 補足（任意）
};

/**
 * 新ブロック方式のカード内ブロック
 */
export type CardBlock = {
  id: string;
  type: 'text' | 'code' | 'image' | 'audio' | 'memo' | 'reference' | 'math' | 'markdown';

  orderIndex: number;
  rowOffset?: number;

  // payload（typeに応じて使う）
  content?: string;
  code?: CodeBlockData;
  images?: UploadedImage[];
  audios?: Array<{ url: string; filename: string; order: number }>;
  references?: ReferenceBlockData[];
  math?: MathBlockData;
  markdown?: string; // Markdown文字列
};

/**
 * カード本体（同期対象）
 */
export type Card = BaseEntity & {
  // 所属/並び
  folderId: string;
  orderIndex: number;
  questionNumber: string;

  // 表示/管理
  title?: string;
  tags?: string[];
  isDraft: boolean;
  hasUncertainty: boolean;
  isBookmarked?: boolean;
  isCompleted: boolean;
  isSilent: boolean;

  // 本文（旧方式）
  questionText: string;
  questionMemo: string;
  questionMarked: string;
  questionImages: UploadedImage[];
  questionAudios: Array<{ url: string; filename: string; order: number }>;
  questionCode?: CodeBlockData | null;

  answerText: string;
  answerMemo: string;
  answerMarked: string;
  answerImages: UploadedImage[];
  answerAudios: Array<{ url: string; filename: string; order: number }>;
  answerCode?: CodeBlockData | null;

  // ブロック方式（新方式）
  questionBlocks?: CardBlock[];
  answerBlocks?: CardBlock[];
  inkQuestion?: InkDocument | null;
  inkAnswer?: InkDocument | null;

  // 学習状態/スケジューリング
  memoryStability: number;

  /**
   * 難易度（0..1）
   * - 「カードの本質的難しさ」ではなく「このユーザーにとって事故りやすい傾向」の推定値
   * - 既存データ互換のため optional（読み込み時に初期値補完推奨）
   */
  difficulty?: number;

  nextReviewDate: Date | Timestamp;
  lastReviewAt?: Date | Timestamp;

  state?: CardState;

  // 記録（UX/分析用）
  lastSubjectiveScore?: SubjectiveScoreValue;
  recoveryRemaining?: number;
  lastReviewDelayDays?: number;
  currentLevel?: number;
  responseTimeMs?: number;
  /** 復習回数（レビュー実行で+1） - 既存カード互換のため optional */
  reviewCount?: number;
  /** 互換用 ID */
  cardId?: string;

  // イベント時刻
  uncertaintyMarkedDate?: Date | Timestamp;
  completedDate?: Date | Timestamp;

  // Recovery data persistence（退避用）
  _rescueRaw?: any;
};

export type DocumentKind = 'pdf' | 'pptx'; // 将来 'md' とか増やしたいならここを拡張

/**
 * PDFビューアの表示状態
 * リロード後に復元可能な UI 状態（利便性データ）
 */
export interface PdfViewerState {
  currentPage?: number;
  scale?: number;
  fitMode?: 'width' | 'manual';
}

export interface DocumentItem extends BaseEntity {

  kind: DocumentKind;          // 'pdf' | 'pptx'
  folderId: string;            // カードと同じく所属フォルダを持つ（並列の核）
  orderIndex: number;          // 並び順（カードと同列で扱うなら必須）

  title: string;               // UI表示名（ファイル名そのままでも可）
  fileName: string;            // 元ファイル名
  mimeType: string;            // 'application/pdf' | pptx など
  sizeBytes: number;

  // ローカル/リモート参照（Blob/Storage URL）
  blobUrl?: BlobUrl | null;
  localUrl?: BlobUrl | null;
  remoteUrl?: StorageUrl | null;
  localFileId?: string | null; // IndexedDB 内のローカルファイルキー

  // Storage連携（後で埋まる）
  storagePath?: string | null; // 例: users/{uid}/docs/{id}.pdf
  downloadUrl?: string | null; // 公開/署名URLなど（設計次第）
  thumbnailUrl?: string | null;

  // 任意
  tags?: string[];
  pageCount?: number | null;   // 取れるなら（後回しOK）

  // 追加: アップロード状態（未表示だが将来UI用）
  uploadStatus?: 'pending' | 'queued' | 'uploading' | 'ready' | 'failed';
  documentId?: string;

  // PPTX変換ステータス（新）
  pptxManifestStatus?: 'none' | 'queued' | 'processing' | 'ready' | 'failed';
  pptxManifestPath?: string | null;
  pptxSlideCount?: number | null;
  pptxLastError?: string | null;
  pptxConvertRequestedAt?: number | null;
  pptxConvertedAt?: number | null;
  pptxSourceSignature?: string | null;
  pptxRetryCount?: number | null;
  pptxNextRetryAt?: number | null;

  // 変換ステータス（PPTX などの非PDFドキュメント向け）
  convertStatus?: 'processing' | 'ready' | 'failed';

  // PPTX変換メタ
  pptx?: {
    manifestPath?: string | null;
    fallbackPdfPath?: string | null;
    slideCount?: number | null;
    updatedAt?: Date | Timestamp;
    error?: string | null;
    sourceSignature?: string | null;
    retryCount?: number | null;
    nextRetryAt?: number | null;
  };

  // PDFビューア表示状態（利便性データ、リロード後復元用）
  viewerState?: PdfViewerState | null;
}

// ✅ localDB.ts の既存 import を壊さないための互換エイリアス
export type Document = DocumentItem;
export type PdfDocument = DocumentItem;

/**
 * Explorer/FolderTree で扱うアイテムの統一 Union
 */
export type ExplorerItem = 
  | { type: 'card'; data: Card }
  | { type: 'document'; data: DocumentItem };

/**
 * 選択状態の統一型
 */
export type SelectedExplorerItem = 
  | { type: 'card'; id: string }
  | { type: 'document'; id: string }
  | null;

export interface FolderMemoItem {
  id: string;
  content: string; // テキスト
  images: UploadedImage[]; // 添付画像
  createdAt: number;
  updatedAt: number;
}

/**
 * フォルダ（同期対象）
 */
export type Folder = BaseEntity & {
  // 階層
  parentFolderId?: string | null;

  // 互換/エイリアス（id と同値）
  folderId: string;

  // 表示
  folderName: string;
  folderColor?: string;

  // 並び
  orderIndex?: number;

  // 挙動/状態
  cloudSyncEnabled: boolean;
  isSilent?: boolean;
  isHidden?: boolean;

  // メモ（旧/新）
  memoText?: string; // deprecated
  memoImages?: UploadedImage[]; // deprecated
  memos?: FolderMemoItem[]; // 複数メモ

  // PDFノート
  notePdfs?: UploadedFile[];
};

export interface CardRelation extends BaseEntity {
  fromCardId: string;
  toCardId: string;

  type: 'premise' | 'derivative' | 'related';
  lineType: 'straight' | 'wave' | 'zigzag' | 'double';

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

// まとめて再エクスポート（外からこの index 的ファイルだけ import すれば済むようにしてる）
export * from './sync';
export * from './code-block';
export * from './media';
export type { BlobUrl, StorageUrl } from './branded';
