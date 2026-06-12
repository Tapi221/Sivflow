import { memo } from "react";
import type { Card, ReviewLog } from "@/types";



type CardMetaSyncStatus = {
  lastSyncedAtMs: number | null;
  hasError?: boolean;
  isRetrying?: boolean;
  canRetry?: boolean;
  onRetry?: () => Promise<void> | void;
};
type CardMetaPanelProps = {
  isLoading?: boolean;
  isVisible?: boolean;
  card: Card | null;
  isEditingCard?: boolean;
  reviewLogs?: ReviewLog[];
  onAddReviewLog: (input: {
    reviewedAt: string;
    rating: ReviewLog["rating"];
    durationMinutes?: number | null;
  }) => void | Promise<void> | Promise<unknown>;
  onUpdateLatestReviewLog?: (input: {
    reviewLogs: ReviewLog[];
    reviewedAt: string;
    rating: ReviewLog["rating"];
    durationMinutes?: number | null;
  }) => void | Promise<void> | Promise<unknown>;
  onDeleteLatestReviewLog?: (input: {
    reviewLogs: ReviewLog[];
  }) => void | Promise<void> | Promise<unknown>;
  onUpdateReviewLogDuration?: (input: {
    reviewLogs: ReviewLog[];
    logIndex: number;
    durationMinutes: number | null;
  }) => void | Promise<void> | Promise<unknown>;
  onFlushAutosave?: () => void | Promise<void>;
  onTitleInputChange?: (nextTitle: string) => void | Promise<void>;
  onUpdateTags: (nextTags: string[]) => void;
  onToggleDraft: (isDraft: boolean) => void;
  onUpdateTitle: (nextTitle: string) => void;
  delayBonusEnabled?: boolean;
  reviewStartNextDay?: boolean;
  mode?: "full" | "calendar";
  tagNamesOverride?: string[];
  syncStatus?: CardMetaSyncStatus;
};



const CardMetaPanelComponent = (_props: CardMetaPanelProps) => null;



const CardMetaPanel = memo(CardMetaPanelComponent);
CardMetaPanel.displayName = "CardMetaPanel";

export { CardMetaPanel };
