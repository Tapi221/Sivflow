import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card } from "@/types";
import type { UserSettings } from "@/types";

const CARDVIEW_EDITING_DRAFT_PATCH_EVENT = "cardview:editing-draft-patch";

interface CardViewMetaPanelProps {
  selectedCard: Card | null;
  isGlobalEditing: boolean;
  settings: UserSettings | undefined;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
}

export function CardViewMetaPanel({
  selectedCard,
  isGlobalEditing,
  settings,
  updateCard,
}: CardViewMetaPanelProps) {
  const patchEditingDraft = (
    patch: Partial<Pick<Card, "title" | "isDraft">> & { tags?: string[] },
  ) => {
    if (typeof window === "undefined" || !selectedCard?.id) return;
    window.dispatchEvent(
      new CustomEvent(CARDVIEW_EDITING_DRAFT_PATCH_EVENT, {
        detail: { cardId: selectedCard.id, patch },
      }),
    );
  };

  return (
    <CardMetaPanel
      card={selectedCard}
      reviewLogs={selectedCard?.reviewLogs ?? []}
      onAddReviewLog={({ reviewedAt, rating, durationMinutes }) => {
        if (!selectedCard?.id) return Promise.resolve();
        const { patch } = createReviewPatchFromRating({
          card: selectedCard,
          rating,
          now: new Date(reviewedAt),
          delayBonusEnabled: settings?.delayBonusEnabled ?? false,
          durationMinutes,
        });
        return Promise.resolve(updateCard(selectedCard.id, patch)).then(
          () => undefined,
        );
      }}
      onUpdateLatestReviewLog={({
        reviewLogs,
        reviewedAt,
        rating,
        durationMinutes,
      }) => {
        if (!selectedCard?.id) return Promise.resolve();
        const { patch } = createLatestReviewLogPatch({
          action: "update",
          card: selectedCard,
          delayBonusEnabled: settings?.delayBonusEnabled ?? false,
          rating,
          reviewedAt: new Date(reviewedAt),
          reviewLogs,
          reviewStartNextDay: settings?.reviewStartNextDay ?? true,
          durationMinutes,
        });
        return Promise.resolve(updateCard(selectedCard.id, patch)).then(
          () => undefined,
        );
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
        return Promise.resolve(updateCard(selectedCard.id, patch)).then(
          () => undefined,
        );
      }}
      onUpdateReviewLogDuration={({ reviewLogs, logIndex, durationMinutes }) => {
        if (!selectedCard?.id) return Promise.resolve();
        const nextReviewLogs = reviewLogs.map((log, index) =>
          index === logIndex ? { ...log, durationMinutes } : log,
        );
        return Promise.resolve(
          updateCard(selectedCard.id, { reviewLogs: nextReviewLogs }),
        ).then(() => undefined);
      }}
      onUpdateTags={(nextTags) => {
        if (!selectedCard?.id) return;
        if (isGlobalEditing) {
          patchEditingDraft({ tags: nextTags });
          return;
        }
        void updateCard(selectedCard.id, { tags: nextTags });
      }}
      onToggleDraft={(nextDraft) => {
        if (!selectedCard?.id) return;
        if (isGlobalEditing) {
          patchEditingDraft({ isDraft: nextDraft });
          return;
        }
        void updateCard(selectedCard.id, { isDraft: nextDraft });
      }}
      onUpdateTitle={(nextTitle) => {
        if (!selectedCard?.id) return;
        if (isGlobalEditing) {
          patchEditingDraft({ title: nextTitle });
          return;
        }
        void updateCard(selectedCard.id, { title: nextTitle });
      }}
      delayBonusEnabled={settings?.delayBonusEnabled ?? false}
      reviewStartNextDay={settings?.reviewStartNextDay ?? true}
    />
  );
}
