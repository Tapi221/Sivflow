import { useCardSetViewMetaPanelActions } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewMetaPanelActions";

import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";

import type { Card, UserSettings } from "@/types";

interface CardSetViewMetaPanelProps {
  isLoading?: boolean;
  selectedCard: Card | null;
  isGlobalEditing: boolean;
  settings: UserSettings | undefined;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
}

export const CardSetViewMetaPanel = ({
  isLoading = false,
  selectedCard,
  isGlobalEditing,
  settings,
  updateCard,
}: CardSetViewMetaPanelProps) => {
  const {
    reviewLogs,
    delayBonusEnabled,
    reviewStartNextDay,
    onAddReviewLog,
    onUpdateLatestReviewLog,
    onDeleteLatestReviewLog,
    onUpdateReviewLogDuration,
    onUpdateTags,
    onToggleDraft,
    onTitleInputChange,
    onUpdateTitle,
  } = useCardSetViewMetaPanelActions({
    selectedCard,
    isGlobalEditing,
    settings,
    updateCard,
  });

  return (
    <CardMetaPanel
      isLoading={isLoading}
      card={selectedCard}
      reviewLogs={reviewLogs}
      onAddReviewLog={onAddReviewLog}
      onUpdateLatestReviewLog={onUpdateLatestReviewLog}
      onDeleteLatestReviewLog={onDeleteLatestReviewLog}
      onUpdateReviewLogDuration={onUpdateReviewLogDuration}
      onUpdateTags={onUpdateTags}
      onToggleDraft={onToggleDraft}
      onTitleInputChange={onTitleInputChange}
      onUpdateTitle={onUpdateTitle}
      delayBonusEnabled={delayBonusEnabled}
      reviewStartNextDay={reviewStartNextDay}
    />
  );
};
