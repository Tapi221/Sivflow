import { useCallback } from "react";

import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card, ReviewLog, UserSettings } from "@/types";

const CARD_SET_VIEW_EDITING_DRAFT_PATCH_EVENT =
  "cardsetview:editing-draft-patch";

type EditingDraftPatch = Partial<Pick<Card, "title" | "isDraft">> & {
  tags?: string[];
};

interface UseCardSetViewMetaPanelActionsOptions {
  selectedCard: Card | null;
  isGlobalEditing: boolean;
  settings: UserSettings | undefined;
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
}

const normalizeReviewLogs = (reviewLogs: Card["reviewLogs"]): ReviewLog[] => {
  return reviewLogs ?? [];
};

export const useCardSetViewMetaPanelActions = ({
  selectedCard,
  isGlobalEditing,
  settings,
  updateCard,
}: UseCardSetViewMetaPanelActionsOptions) => {
  const delayBonusEnabled = settings?.delayBonusEnabled ?? false;
  const reviewStartNextDay = settings?.reviewStartNextDay ?? true;
  const reviewLogs = selectedCard?.reviewLogs ?? [];

  const patchEditingDraft = useCallback(
    (patch: EditingDraftPatch) => {
      if (typeof window === "undefined" || !selectedCard?.id) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent(CARD_SET_VIEW_EDITING_DRAFT_PATCH_EVENT, {
          detail: {
            cardId: selectedCard.id,
            patch,
          },
        }),
      );
    },
    [selectedCard?.id],
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
      if (!selectedCard?.id) {
        return;
      }

      const { patch } = createReviewPatchFromRating({
        card: selectedCard,
        rating,
        now: new Date(reviewedAt),
        delayBonusEnabled,
        durationMinutes,
      });

      await updateCard(selectedCard.id, patch);
    },
    [delayBonusEnabled, selectedCard, updateCard],
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
      if (!selectedCard?.id) {
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

      await updateCard(selectedCard.id, patch);
    },
    [delayBonusEnabled, reviewStartNextDay, selectedCard, updateCard],
  );

  const onDeleteLatestReviewLog = useCallback(
    async ({
      reviewLogs: nextReviewLogs,
    }: {
      reviewLogs: Card["reviewLogs"];
    }) => {
      if (!selectedCard?.id) {
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

      await updateCard(selectedCard.id, patch);
    },
    [delayBonusEnabled, reviewStartNextDay, selectedCard, updateCard],
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
      if (!selectedCard?.id) {
        return;
      }

      const normalizedReviewLogs = normalizeReviewLogs(nextReviewLogs);

      const patchedReviewLogs = normalizedReviewLogs.map((log, index) =>
        index === logIndex ? { ...log, durationMinutes } : log,
      );

      await updateCard(selectedCard.id, {
        reviewLogs: patchedReviewLogs,
      });
    },
    [selectedCard?.id, updateCard],
  );

  const onUpdateTags = useCallback(
    (nextTags: string[]) => {
      if (!selectedCard?.id) {
        return;
      }

      if (isGlobalEditing) {
        patchEditingDraft({ tags: nextTags });
        return;
      }

      void updateCard(selectedCard.id, { tags: nextTags });
    },
    [isGlobalEditing, patchEditingDraft, selectedCard?.id, updateCard],
  );

  const onToggleDraft = useCallback(
    (nextDraft: boolean) => {
      if (!selectedCard?.id) {
        return;
      }

      if (isGlobalEditing) {
        patchEditingDraft({ isDraft: nextDraft });
        return;
      }

      void updateCard(selectedCard.id, { isDraft: nextDraft });
    },
    [isGlobalEditing, patchEditingDraft, selectedCard?.id, updateCard],
  );

  const onTitleInputChange = useCallback(
    (nextTitle: string) => {
      if (!selectedCard?.id || !isGlobalEditing) {
        return;
      }

      patchEditingDraft({ title: nextTitle });
    },
    [isGlobalEditing, patchEditingDraft, selectedCard?.id],
  );

  const onUpdateTitle = useCallback(
    (nextTitle: string) => {
      if (!selectedCard?.id) {
        return;
      }

      if (isGlobalEditing) {
        patchEditingDraft({ title: nextTitle });
        return;
      }

      void updateCard(selectedCard.id, { title: nextTitle });
    },
    [isGlobalEditing, patchEditingDraft, selectedCard?.id, updateCard],
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