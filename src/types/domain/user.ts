import { Timestamp } from "firebase/firestore";
import type { BaseEntity, BlockConfig } from "./base";



interface User {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  authMethods: ("email" | "google" | "apple" | "microsoft")[];
  plan: "free" | "pro";
  isSuspended?: boolean;
  baseQuotaMB: number;
  extraQuotaMB: number;
  usedQuotaMB: number;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  deviceId: string;
  lastLoginAt: Date | Timestamp;
}
interface UserSettings extends BaseEntity {
  weekStartDay: "sunday" | "monday";
  language: "ja" | "en" | "zh";
  levelColors: { [level: number]: string; };
  notificationsEnabled: boolean;
  notificationMethods: ("browser" | "email" | "line")[];
  notificationTimes: { [dayOfWeek: number]: string; };
  dayStartTime: string;
  soundEnabled: boolean;
  correctSound: boolean;
  incorrectSound: boolean;
  clickSound: boolean;
  soundVolume: number;
  levelDownBehavior: "decrement" | "maintain";
  autoResetDaysThreshold: number;
  completionLevelThreshold: number;
  swipeLoopMode: boolean;
  accentColor?: string;
  showReviewHard?: boolean;
  showReviewEasy?: boolean;
  autoCarryOver?: boolean;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;
  defaultPreviewEnabled?: boolean;
  autoDraftEnabled?: boolean;
  autoSaveEnabled?: boolean;
  autoVoiceQuestion?: boolean;
  autoVoiceAnswer?: boolean;
  duplicateToOpposite?: boolean;
  cardEditorHeightPx?: number | null;
  cardViewPaneWidthPx?: number | null;
  cardEditPaneWidthPx?: number | null;
  editorBlockSettings?: BlockConfig[];
  questionDisplayMode?: "always" | "tap_to_reveal";
  blockButtonShowLabel?: boolean;
  tagCategoryDisplayNames?: Record<string, string>;
  markdownTabSize?: 2 | 4 | 8;
}
interface UserStats extends BaseEntity {
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

export type { User, UserSettings, UserStats };
