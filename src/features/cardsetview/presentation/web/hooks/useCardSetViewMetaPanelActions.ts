import { useCallback } from "react";
import { CARD_SET_VIEW_EVENTS } from "@/features/cardsetview/events/cardSetViewEvents.constants";
import type { CardSetViewEditingDraftPatch } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { dispatchCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { createLatestReviewLogPatch, createReviewPatchFromRating } from "@/services/reviewAlgorithm";
import type { Card, ReviewLog, UserSettings } from "@/types";



type EditingDraftPatch = CardSetViewEditingDraftPatch["patch"];
interface UseCardSetViewMetaPanelActionsOptions {
  selectedCard: Card | null;
  isGlobalEditing: boolean;
  settings: UserSettings | undefined;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
}



const normalizeReviewLogs = (reviewLogs: Card["reviewLogs"]): ReviewLog[] => {
  return reviewLogs ?? [];
};
const useCardSetViewMetaPanelActions = ({ selectedCard, isGlobalEditing, settings, updateCard }: UseCardSetViewMetaPanelActionsOptions) => {
  const delayBonusEnabled = settings?.delayBonusEnabled ?? false;
  const reviewStartNextDay = settings?.reviewStartNextDay ?? true;
  const reviewLogs = selectedCard?.reviewLogs ?? [];
  const selectedCardId = selectedCard?.id ?? null;

  const patchEditingDraft = useCallback(
    (patch: EditingDraftPatch) => {
      if (typeof window === "undefined" || !selectedCardId) {
        return;
      }

      dispatchCardSetViewWindowEvent(CARD_SET_VIEW_EVENTS.editingDraftPatch, {
        cardId: selectedCardId,
        patch,
      });
    },
    [selectedCardId],
  );

  const onAddReviewLog = useCallback(
    async ({
      reviewedAt,
      rating,
      durationMinutes,
    }: {
      reviewedAt: string | number | Date;
      rating: ReviewLog["rating"];
      durationMinutes?: number | null;
    }) => {
      if (!selectedCard || !selectedCardId) {
        return;
      }

      const { patch } = createReviewPatchFromRating({
        card: selectedCard,
        rating,
        now: new Date(reviewedAt),
        delayBonusEnabled,
        durationMinutes,
      });

      await updateCard(selectedCardId, patch);
    },
    [delayBonusEnabled, selectedCard, selectedCardId, updateCard],
  );

  const onUpdateLatestReviewLog = useCallback(
    async ({
      reviewLogs: nextReviewLogs,
      reviewedAt,
      rating,
      durationMinutes,
    }: {
      reviewLogs: Card["reviewLogs"];
      reviewedAt: string | number | Date;
      rating: ReviewLog["rating"];
      durationMinutes?: number | null;
    }) => {
      if (!selectedCard || !selectedCardId) {
        return;
      }

      const normalizedReviewLogs = normalizeReviewLogs(nextReviewLogs);

      const { patch } = createLatestReviewLogPatch({
        action: "update",
        card: selectedCard,
        delayBonusEnabled,
        rating,
        reviewedAt: new Date(reviewedAt),
        reviewLogs: normalizedReviewLogs,
        reviewStartNextDay,
        durationMinutes,
      });

      await updateCard(selectedCardId, patch);
    },
    [
      delayBonusEnabled,
      reviewStartNextDay,
      selectedCard,
      selectedCardId,
      updateCard,
    ],
  );

  const onDeleteLatestReviewLog = useCallback(
    async ({
      reviewLogs: nextReviewLogs,
    }: {
      reviewLogs: Card["reviewLogs"];
    }) => {
      if (!selectedCard || !selectedCardId) {
        return;
      }

      const normalizedReviewLogs = normalizeReviewLogs(nextReviewLogs);

      const { patch } = createLatestReviewLogPatch({
        action: "delete",
        card: selectedCard,
        delayBonusEnabled,
        reviewLogs: normalizedReviewLogs,
        reviewStartNextDay,
      });

      await updateCard(selectedCardId, patch);
    },
    [
      delayBonusEnabled,
      reviewStartNextDay,
      selectedCard,
      selectedCardId,
      updateCard,
    ],
  );

  const onUpdateReviewLogDuration = useCallback(
    async ({
      reviewLogs: nextReviewLogs,
      logIndex,
      durationMinutes,
    }: {
      reviewLogs: Card["reviewLogs"];
      logIndex: number;
      durationMinutes?: number | null;
    }) => {
      if (!selectedCardId) {
        return;
      }

      const normalizedReviewLogs = normalizeReviewLogs(nextReviewLogs);

      const patchedReviewLogs = normalizedReviewLogs.map((log, index) =>
        index === logIndex ? { ...log, durationMinutes } : log,
      );

      await updateCard(selectedCardId, {
        reviewLogs: patchedReviewLogs,
      });
    },
    [selectedCardId, updateCard],
  );

  const onUpdateTags = useCallback(
    (nextTags: string[]) => {
      if (!selectedCardId) {
        return;
      }

      if (isGlobalEditing) {
        patchEditingDraft({ tags: nextTags });
        return;
      }

      void updateCard(selectedCardId, { tags: nextTags });
    },
    [isGlobalEditing, patchEditingDraft, selectedCardId, updateCard],
  );

  const onToggleDraft = useCallback(
    (nextDraft: boolean) => {
      if (!selectedCardId) {
        return;
      }

      if (isGlobalEditing) {
        patchEditingDraft({ isDraft: nextDraft });
        return;
      }

      void updateCard(selectedCardId, { isDraft: nextDraft });
    },
    [isGlobalEditing, patchEditingDraft, selectedCardId, updateCard],
  );

  const onTitleInputChange = useCallback(
    (nextTitle: string) => {
      if (!selectedCardId || !isGlobalEditing) {
        return;
      }

      patchEditingDraft({ title: nextTitle });
    },
    [isGlobalEditing, patchEditingDraft, selectedCardId],
  );

  const onUpdateTitle = useCallback(
    (nextTitle: string) => {
      if (!selectedCardId) {
        return;
      }

      if (isGlobalEditing) {
        patchEditingDraft({ title: nextTitle });
        return;
      }

      void updateCard(selectedCardId, { title: nextTitle });
    },
    [isGlobalEditing, patchEditingDraft, selectedCardId, updateCard],
  );

  return {
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
  };
};



export { useCardSetViewMetaPanelActions };
