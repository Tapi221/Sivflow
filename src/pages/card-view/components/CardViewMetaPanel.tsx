import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card } from "@/types";
import type { UserSettings } from "@/types";

interface CardViewMetaPanelProps {
  selectedCard: Card | null;
  settings: UserSettings | undefined;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
}

export function CardViewMetaPanel({
  selectedCard,
  settings,
  updateCard,
}: CardViewMetaPanelProps) {
  return (
    <CardMetaPanel
      card={selectedCard}
      reviewLogs={selectedCard?.reviewLogs ?? []}
      onAddReviewLog={({ reviewedAt, rating }) => {
        if (!selectedCard?.id) return Promise.resolve();
        const { patch } = createReviewPatchFromRating({
          card: selectedCard,
          rating,
          now: new Date(reviewedAt),
          delayBonusEnabled: settings?.delayBonusEnabled ?? false,
        });
        return updateCard(selectedCard.id, patch);
      }}
      onUpdateLatestReviewLog={({ reviewLogs, reviewedAt, rating }) => {
        if (!selectedCard?.id) return Promise.resolve();
        const { patch } = createLatestReviewLogPatch({
          action: "update",
          card: selectedCard,
          delayBonusEnabled: settings?.delayBonusEnabled ?? false,
          rating,
          reviewedAt: new Date(reviewedAt),
          reviewLogs,
          reviewStartNextDay: settings?.reviewStartNextDay ?? true,
        });
        return updateCard(selectedCard.id, patch);
      }}
      onDeleteLatestReviewLog={({ reviewLogs }) => {
        if (!selectedCard?.id) return Promise.resolve();
        const { patch } = createLatestReviewLogPatch({
          action: "delete",
          card: selectedCard,
          delayBonusEnabled: settings?.delayBonusEnabled ?? false,
          reviewLogs,
          reviewStartNextDay: settings?.reviewStartNextDay ?? true,
        });
        return updateCard(selectedCard.id, patch);
      }}
      onUpdateTags={(nextTags) => {
        if (!selectedCard?.id) return;
        void updateCard(selectedCard.id, { tags: nextTags });
      }}
      onToggleDraft={(nextDraft) => {
        if (!selectedCard?.id) return;
        void updateCard(selectedCard.id, { isDraft: nextDraft });
      }}
      onUpdateTitle={(nextTitle) => {
        if (!selectedCard?.id) return;
        void updateCard(selectedCard.id, { title: nextTitle });
      }}
      delayBonusEnabled={settings?.delayBonusEnabled ?? false}
      reviewStartNextDay={settings?.reviewStartNextDay ?? true}
    />
  );
}
