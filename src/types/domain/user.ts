import { Timestamp } from "firebase/firestore";
import type { BaseEntity, BlockConfig } from "./base";
import type { ProfileImage } from "./assets";

export interface User {
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

export interface UserSettings extends BaseEntity {
  displayName?: string;
  profileImage?: ProfileImage | null;
  weekStartDay: "sunday" | "monday";
  language: "ja" | "en" | "zh";
  accentColor: string;
  levelColors: { [level: number]: string };
  notificationsEnabled: boolean;
  notificationMethods: ("browser" | "email" | "line")[];
  notificationTimes: { [dayOfWeek: number]: string };
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
  showReviewHard?: boolean;
  showReviewEasy?: boolean;
  autoCarryOver?: boolean;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;
  defaultPreviewEnabled?: boolean;
  autoDraftEnabled?: boolean;
  autoSaveEnabled?: boolean;
  duplicateToOpposite?: boolean;
  cardEditorHeightPx?: number | null;
  cardViewPaneWidthPx?: number | null;
  cardEditPaneWidthPx?: number | null;
  editorBlockSettings?: BlockConfig[];
  questionDisplayMode?: "always" | "tap_to_reveal";
  blockButtonShowLabel?: boolean;
  tagCategoryDisplayNames?: Record<string, string>;
}

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




