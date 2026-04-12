import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card, UserSettings } from "@/types";

export type EditingDraftPatchDetail = {
  cardId: string;
  patch: Partial<Pick<Card, "title" | "isDraft">> & { tags?: string[] };
};

export const CARD_SET_VIEW_EDITING_DRAFT_PATCH_EVENT =
  "cardsetview:editing-draft-patch";

export const META_PANEL_OPEN_STORAGE_KEY = "card-editor.meta-panel-open";

export const buildCardsById = (cards: Card[]) => {
  const map = new Map<string, Card>();
  for (const card of cards) {
    map.set(card.id, card);
  }
  return map;
};

export const resolveSelectedCardSnapshot = ({
  selectedCardId,
  cardsById,
}: {
  selectedCardId: string | null;
  cardsById: Map<string, Card>;
}) => {
  if (!selectedCardId) return null;
  return cardsById.get(selectedCardId) ?? null;
};

export const applyEditingDraftPatch = ({
  currentDraft,
  detail,
  selectedCardId,
  isEditing,
}: {
  currentDraft: {
    title: string;
    isDraft: boolean;
    tags: string[];
  } | null;
  detail: EditingDraftPatchDetail | null | undefined;
  selectedCardId: string | null;
  isEditing: boolean;
}) => {
  if (!currentDraft || !detail || !isEditing) return currentDraft;
  if (!selectedCardId || detail.cardId !== selectedCardId) return currentDraft;

  const nextTitle =
    typeof detail.patch.title === "string" ? detail.patch.title : undefined;
  const nextIsDraft =
    typeof detail.patch.isDraft === "boolean"
      ? detail.patch.isDraft
      : undefined;
  const nextTags = Array.isArray(detail.patch.tags)
    ? detail.patch.tags
    : undefined;

  if (
    nextTitle === undefined &&
    nextIsDraft === undefined &&
    nextTags === undefined
  ) {
    return currentDraft;
  }

  return {
    ...currentDraft,
    ...(nextTitle !== undefined ? { title: nextTitle } : {}),
    ...(nextIsDraft !== undefined ? { isDraft: nextIsDraft } : {}),
    ...(nextTags !== undefined ? { tags: nextTags } : {}),
  };
};

export const readStoredMetaPanelOpen = () => {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(META_PANEL_OPEN_STORAGE_KEY) !== "false";
};

export const writeStoredMetaPanelOpen = (isOpen: boolean) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(META_PANEL_OPEN_STORAGE_KEY, String(isOpen));
};

type CreateMetaPanelActionsArgs = {
  selectedCard: Card | null;
  settings?: Partial<UserSettings> | null;
  updateCard: (cardId: string, data: unknown) => void | Promise<void>;
  onCardUpdated?: () => void;
  flushDraft: (args?: {
    reason?: "autosave";
    showSuccessToast?: boolean;
  }) => Promise<boolean>;
  handleTitleInputChange: (nextTitle: string) => void;
  handleUpdateTags: (nextTags: string[]) => Promise<void>;
  handleToggleDraft: (nextIsDraft: boolean) => Promise<void>;
  handleUpdateTitle: (nextTitle: string) => Promise<void>;
};

export const createMetaPanelActions = ({
  selectedCard,
  settings,
  updateCard,
  onCardUpdated,
  flushDraft,
  handleTitleInputChange,
  handleUpdateTags,
  handleToggleDraft,
  handleUpdateTitle,
}: CreateMetaPanelActionsArgs) => {
  const onAddReviewLog = ({
    reviewedAt,
    rating,
    durationMinutes,
  }: {
    reviewedAt: string | number | Date;
    rating: number;
    durationMinutes?: number | null;
  }) => {
    if (!selectedCard?.id) return Promise.resolve();

    const { patch } = createReviewPatchFromRating({
      card: selectedCard,
      rating,
      now: new Date(reviewedAt),
      delayBonusEnabled: settings?.delayBonusEnabled ?? false,
      durationMinutes,
    });

    return Promise.resolve(updateCard(selectedCard.id, patch)).then(() => {
      onCardUpdated?.();
    });
  };

  const onUpdateLatestReviewLog = ({
    reviewLogs,
    reviewedAt,
    rating,
    durationMinutes,
  }: {
    reviewLogs: Card["reviewLogs"];
    reviewedAt: string | number | Date;
    rating: number;
    durationMinutes?: number | null;
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

    return Promise.resolve(updateCard(selectedCard.id, patch)).then(() => {
      onCardUpdated?.();
    });
  };

  const onDeleteLatestReviewLog = ({
    reviewLogs,
  }: {
    reviewLogs: Card["reviewLogs"];
  }) => {
    if (!selectedCard?.id) return Promise.resolve();

    const { patch } = createLatestReviewLogPatch({
      action: "delete",
      card: selectedCard,
      delayBonusEnabled: settings?.delayBonusEnabled ?? false,
      reviewLogs,
      reviewStartNextDay: settings?.reviewStartNextDay ?? true,
    });

    return Promise.resolve(updateCard(selectedCard.id, patch)).then(() => {
      onCardUpdated?.();
    });
  };

  const onUpdateReviewLogDuration = ({
    reviewLogs,
    logIndex,
    durationMinutes,
  }: {
    reviewLogs: Card["reviewLogs"];
    logIndex: number;
    durationMinutes?: number | null;
  }) => {
    if (!selectedCard?.id) return Promise.resolve();

    const nextReviewLogs = reviewLogs.map((log, index) =>
      index === logIndex ? { ...log, durationMinutes } : log,
    );

    return Promise.resolve(
      updateCard(selectedCard.id, {
        reviewLogs: nextReviewLogs,
      }),
    ).then(() => {
      onCardUpdated?.();
    });
  };

  return {
    onAddReviewLog,
    onUpdateLatestReviewLog,
    onDeleteLatestReviewLog,
    onUpdateReviewLogDuration,
    onFlushAutosave: () =>
      flushDraft({
        reason: "autosave",
        showSuccessToast: false,
      }),
    onTitleInputChange: handleTitleInputChange,
    onUpdateTags: handleUpdateTags,
    onToggleDraft: handleToggleDraft,
    onUpdateTitle: handleUpdateTitle,
  };
};
