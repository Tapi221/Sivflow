import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Volume2Icon from "lucide-react/dist/esm/icons/volume-2";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import { DragDropContext } from "@hello-pangea/dnd";

import { Flashcard } from "@/components/card/frame/Flashcard";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import MediaUploader from "@/components/card/media/MediaUploader";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import { sortBlocksByOrderIndex } from "@/components/card/blocks/blockOrdering";
import {
  CANONICAL_CARD_WIDTH,
  cardHeightPxToLayoutRows,
  layoutRowsToCardHeightPx,
  minCardHeightPxToLayoutRows,
  CARD_HEIGHT_PHASE_PX,
  CARD_ROW_PX,
} from "@/components/card/common/constants";
import {
  DEFAULT_LAYOUT_ROWS,
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCards } from "@/hooks/useCards";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/contexts/ToastContext";
import { useTags, resolveCardTagNames } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

import type { CardBlock, ReferenceBlockData, UploadedImage } from "@/types";

type DndLocation = { droppableId: string; index: number };
type DndResult = { source: DndLocation; destination?: DndLocation | null };

type EditorDraft = {
  title: string;
  tags: string[];
  isDraft: boolean;
  questionImages: UploadedImage[];
  answerImages: UploadedImage[];
  questionBlocks: CardBlock[];
  answerBlocks: CardBlock[];
  layoutRows: number;
};

interface CardEditorPaneProps {
  selectedCardId: string | null;
  folderId?: string;
  autoEdit?: boolean;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
}

const NEW_SENTINEL = "__new__" as const;

function normalizeSelectedCardId(raw: string | null): string | null {
  if (!raw) return null;
  if (raw === NEW_SENTINEL) return NEW_SENTINEL;
  if (raw === "new" || raw === "NEW" || raw === "create") return NEW_SENTINEL;
  return raw;
}

function makeNewDraft(): EditorDraft {
  return {
    title: "",
    tags: [],
    isDraft: false,
    questionImages: [],
    answerImages: [],
    questionBlocks: [],
    answerBlocks: [],
    layoutRows: DEFAULT_LAYOUT_ROWS,
  };
}

function sanitizeReferences(refs: ReferenceBlockData[]): ReferenceBlockData[] {
  return (refs ?? [])
    .map((r) => ({
      url: (r?.url ?? "").trim(),
      name: (r?.name ?? "").trim(),
    }))
    .filter((r) => r.url.length > 0 || r.name.length > 0);
}

function normalizeOrderIndex(blocks: CardBlock[]): CardBlock[] {
  return (blocks ?? []).map((b, i) => ({ ...b, orderIndex: i }));
}

function normalizeCrossSideId(blockId: unknown, nextSide: "question" | "answer"): string | null {
  if (typeof blockId !== "string") return null;
  if (blockId.startsWith("question-")) return blockId.replace(/^question-/, `${nextSide}-`);
  if (blockId.startsWith("answer-")) return blockId.replace(/^answer-/, `${nextSide}-`);
  return null;
}

function isBlockEmpty(block: CardBlock): boolean {
  if (block.type === "reference" || block.type === "audio") return true;
  if (block.type === "text") return !String(block.content ?? "").trim();
  if (block.type === "markdown") return !String(block.markdown ?? "").trim();
  if (block.type === "code") return !String(block.code?.code ?? "").trim();
  if (block.type === "math") return !String(block.math?.latex ?? "").trim();
  if (block.type === "image") return (block.images?.length ?? 0) === 0;
  return true;
}

function shouldAutoOpenEditorForCard(card: unknown): boolean {
  if (!card) return false;
  if (String(card?.title ?? "").trim().length > 0) return false;
  if ((card?.tagIds ?? card?.tags ?? []).length > 0) return false;
  const questionBlocks = (card?.questionBlocks ?? []) as CardBlock[];
  const answerBlocks = (card?.answerBlocks ?? []) as CardBlock[];
  const hasQuestionContent = questionBlocks.some((b) => !isBlockEmpty(b));
  const hasAnswerContent = answerBlocks.some((b) => !isBlockEmpty(b));
  return !hasQuestionContent && !hasAnswerContent;
}

export function CardEditorPane({ selectedCardId, folderId, autoEdit, onCardUpdated, onSelectCardId }: CardEditorPaneProps) {
  const { settings } = useUserSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const { tagById, addTag } = useTags();

  // ★重要：createCard が無い場合はここだけあなたの実装名に合わせて変更
  const { cards, updateCard, createCard } = useCards() as any;

  // 親が selectedCardId を渡さないケース（未選択状態から新規作成）を救うための fallback
  const [localSelectedCardId, setLocalSelectedCardId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedCardId != null) setLocalSelectedCardId(null);
  }, [selectedCardId]);

  const effectiveSelectedCardId = selectedCardId ?? localSelectedCardId;
  const normalizedSelectedCardId = useMemo(
    () => normalizeSelectedCardId(effectiveSelectedCardId),
    [effectiveSelectedCardId]
  );
  const isNew = normalizedSelectedCardId === NEW_SENTINEL;

  const selectedCard = useMemo(() => {
    if (!normalizedSelectedCardId || isNew) return null;
    return cards.find((c: unknown) => c.id === normalizedSelectedCardId) ?? null;
  }, [cards, normalizedSelectedCardId, isNew]);

  // 閲覧状態
  const [isFlipped, setIsFlipped] = useState(false);

  // 編集状態（右ペイン内）
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDialogSide, setImageDialogSide] = useState<"question" | "answer" | null>(null);
  const [audioDialogSide, setAudioDialogSide] = useState<"question" | "answer" | null>(null);
  const [linkDialogSide, setLinkDialogSide] = useState<"question" | "answer" | null>(null);

  // 編集中の対象IDを固定して、cards更新時のdraft上書きを防ぐ
  const editingCardIdRef = useRef<string | null>(null);
  const hydratedFromIdRef = useRef<string | null>(null);
  const autoOpenCheckedIdRef = useRef<string | null>(null);

  const [isMetaOpen, setIsMetaOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("card-editor.meta-panel-open") !== "false";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("card-editor.meta-panel-open", String(isMetaOpen));
  }, [isMetaOpen]);

  // ツールバーの外部マウント先（問題・解答 各カードの上）
  const toolbarMountRefQ = useRef<HTMLDivElement | null>(null);
  const toolbarMountRefA = useRef<HTMLDivElement | null>(null);

  // 編集用ドラフト（右ペイン内で完結）
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const rowsRafRef = useRef<number | null>(null);
  const pendingRowsRef = useRef<number | null>(null);
  const layoutRowsRef = useRef<number>(DEFAULT_LAYOUT_ROWS);
  const allowAutoMinHeightSyncRef = useRef(false);
  const manualResizeInProgressRef = useRef(false);
  const minHeightPxBySideRef = useRef<{ question: number; answer: number }>({
    question: layoutRowsToCardHeightPx(DEFAULT_LAYOUT_ROWS),
    answer: layoutRowsToCardHeightPx(DEFAULT_LAYOUT_ROWS),
  });

  const rowsFromMinHeightPx = useCallback((minHeightPx: number): number => {
    const safeHeight = Number.isFinite(minHeightPx) ? minHeightPx : 0;
    return normalizeLayoutRows(minCardHeightPxToLayoutRows(Math.max(0, safeHeight)));
  }, []);

  const getRequiredMinRows = useCallback((): number => {
    const requiredHeightPx = Math.max(
      minHeightPxBySideRef.current.question,
      minHeightPxBySideRef.current.answer
    );
    return rowsFromMinHeightPx(requiredHeightPx);
  }, [rowsFromMinHeightPx]);

  const buildDraftFromCard = useCallback((card: unknown): EditorDraft => {
    const legacyQuestionRows = normalizeExtraRows(card?.questionExtraRows ?? card?.question_extra_rows ?? 0);
    const legacyAnswerRows = normalizeExtraRows(card?.answerExtraRows ?? card?.answer_extra_rows ?? 0);
    const migratedRows = LEGACY_BASE_LAYOUT_ROWS + Math.max(legacyQuestionRows, legacyAnswerRows);

    return {
      title: card?.title ?? "",
      // tagIds 優先、fallback: card.tags（移行期間互換）
      tags: resolveCardTagNames(card?.tagIds, card?.tags, tagById),
      isDraft: card?.isDraft ?? false,
      questionImages: ((card as any)?.questionImages ?? []) as UploadedImage[],
      answerImages: ((card as any)?.answerImages ?? []) as UploadedImage[],
      questionBlocks: sortBlocksByOrderIndex((card?.questionBlocks ?? []) as CardBlock[]),
      answerBlocks: sortBlocksByOrderIndex((card?.answerBlocks ?? []) as CardBlock[]),
      layoutRows: normalizeLayoutRows(card?.layoutRows ?? card?.layout_rows ?? migratedRows),
    };
  }, [tagById]);

  useEffect(() => {
    layoutRowsRef.current = normalizeLayoutRows(draft?.layoutRows);
  }, [draft?.layoutRows]);

  useEffect(() => {
    const baseHeight = layoutRowsToCardHeightPx(DEFAULT_LAYOUT_ROWS);
    allowAutoMinHeightSyncRef.current = false;
    minHeightPxBySideRef.current = {
      question: baseHeight,
      answer: baseHeight,
    };
  }, [normalizedSelectedCardId, isEditing]);

  // 選択IDが変わった時だけ、最低限の状態遷移をする（※依存に isEditing を入れない）
  useEffect(() => {
    if (!normalizedSelectedCardId) {
      setIsFlipped(false);
      setIsEditing(false);
      setDraft(null);
      editingCardIdRef.current = null;
      hydratedFromIdRef.current = null;
      autoOpenCheckedIdRef.current = null;
      return;
    }

    setIsFlipped(false);

    // 新規モードに入った瞬間だけ編集を開始（キャンセルで isEditing=false にできる）
    if (normalizedSelectedCardId === NEW_SENTINEL) {
      setIsEditing(true);
      setDraft((prev) => prev ?? makeNewDraft());
      editingCardIdRef.current = NEW_SENTINEL;
      hydratedFromIdRef.current = NEW_SENTINEL;
      autoOpenCheckedIdRef.current = NEW_SENTINEL;
      return;
    }

    // 既存カードは一旦閲覧モードへ（autoEdit=true なら即編集モードへ）。
    // ★/はてな等の updateCard による参照更新で draft を飛ばさないよう、
    // 「空カード判定による自動編集オープン」は別Effectで “選択直後だけ” 実施する。
    setIsEditing(!!autoEdit);
    setDraft(null);
    editingCardIdRef.current = null;
    hydratedFromIdRef.current = null;
    autoOpenCheckedIdRef.current = null;
  }, [normalizedSelectedCardId]);

  // 新規作成直後の空カードは自動で編集モードを開く（選択直後に1回だけ）
  useEffect(() => {
    if (!normalizedSelectedCardId) return;
    if (normalizedSelectedCardId === NEW_SENTINEL) return;
    if (!selectedCard) return;
    if (isEditing) return;

    if (autoOpenCheckedIdRef.current === normalizedSelectedCardId) return;
    autoOpenCheckedIdRef.current = normalizedSelectedCardId;

    if (shouldAutoOpenEditorForCard(selectedCard)) {
      setIsEditing(true);
    }
  }, [normalizedSelectedCardId, selectedCard, isEditing]);

  // isEditing の開始/終了で target を固定
  useEffect(() => {
    if (isEditing) {
      editingCardIdRef.current = isNew ? NEW_SENTINEL : normalizedSelectedCardId;
    } else {
      editingCardIdRef.current = null;
      hydratedFromIdRef.current = null;
      setDraft(null);
    }
  }, [isEditing, isNew, normalizedSelectedCardId]);

  // 編集開始時にだけドラフトを hydrate（cards更新で上書きしない）
  useEffect(() => {
    if (!isEditing) return;

    const targetId = isNew ? NEW_SENTINEL : normalizedSelectedCardId;
    if (!targetId) return;

    if (isNew) {
      setDraft((prev) => prev ?? makeNewDraft());
      hydratedFromIdRef.current = NEW_SENTINEL;
      return;
    }

    if (!selectedCard) return;
    if (hydratedFromIdRef.current === selectedCard.id) return;

    setDraft(buildDraftFromCard(selectedCard));
    hydratedFromIdRef.current = selectedCard.id;
  }, [isEditing, isNew, normalizedSelectedCardId, selectedCard, buildDraftFromCard]);

  // 閲覧側のトグル（既存カードのみ）
  const handleToggleBookmark = async (card: unknown) => {
    try {
      await updateCard(card.id, { isBookmarked: !card.isBookmarked });
      onCardUpdated?.();
    } catch (error) {
      console.error("ブックマークの更新に失敗しました:", error);
    }
  };

  const handleToggleUncertainty = async (card: unknown) => {
    try {
      await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
      onCardUpdated?.();
    } catch (error) {
      console.error("不確証マークの更新に失敗しました:", error);
    }
  };

  // 編集画面用の actionsTopLeft（星・はてなボタン）
  const editorActionsTopLeft = selectedCard ? (
    <CardCornerActions
      onHelp={() => handleToggleUncertainty(selectedCard)}
      onStar={() => handleToggleBookmark(selectedCard)}
      helpActive={selectedCard.hasUncertainty ?? false}
      starActive={selectedCard.isBookmarked ?? false}
    />
  ) : undefined;

  const handleStartNew = useCallback(() => {
    setDraft(makeNewDraft());
    setIsEditing(true);

    if (typeof onSelectCardId === "function") {
      onSelectCardId(NEW_SENTINEL);
    } else {
      setLocalSelectedCardId(NEW_SENTINEL);
    }
  }, [onSelectCardId]);

  const handleCancel = useCallback(() => {
    setIsSaving(false);
    setImageDialogSide(null);
    setAudioDialogSide(null);
    setLinkDialogSide(null);

    setDraft(null);
    setIsEditing(false);

    if (!selectedCardId && localSelectedCardId === NEW_SENTINEL) {
      // 親が未管理の場合は空状態へ戻す
      setLocalSelectedCardId(null);
    }
  }, [selectedCardId, localSelectedCardId]);

  const handleSave = async () => {
    if (!draft) return;

    try {
      setIsSaving(true);

      const sanitizeBlocksForSave = (blocks: CardBlock[]): CardBlock[] => {
        const next: CardBlock[] = [];
        for (const b of blocks ?? []) {
          if (b?.type === "reference") {
            const cleaned = sanitizeReferences((b as any)?.references ?? []);
            if (cleaned.length === 0) continue;
            next.push({ ...(b as any), references: cleaned } as any);
            continue;
          }
          next.push(b);
        }
        return normalizeOrderIndex(next);
      };

      // draft.tags はタグ名の配列。tags_v3 に登録しIDを収集して tagIds で保存。
      const resolvedTags = await Promise.all(draft.tags.map(name => addTag(name)));
      const tagIds = resolvedTags.map(t => t.id);

      const payload = {
        title: draft.title,
        tagIds,
        isDraft: draft.isDraft,
        questionImages: draft.questionImages,
        answerImages: draft.answerImages,
        questionBlocks: sanitizeBlocksForSave(draft.questionBlocks),
        answerBlocks: sanitizeBlocksForSave(draft.answerBlocks),
        layoutRows: normalizeLayoutRows(draft.layoutRows),
      };

      if (isNew) {
        if (typeof createCard !== "function") {
          console.error(
            "[CardEditorPane] createCard が useCards にありません。useCards の作成関数名に合わせて置き換えてください。"
          );
          toastError?.("カードの作成関数が見つかりません");
          return;
        }

        const created = await createCard({ ...payload, folderId: folderId ?? '' });

        const newId =
          (typeof created === "object" && created !== null && "id" in created && (created as any).id) ||
          (typeof created === "string" ? created : null);

        onCardUpdated?.();
        toastSuccess?.("カードを作成しました");

        if (newId) {
          if (typeof onSelectCardId === "function") onSelectCardId(newId);
          else setLocalSelectedCardId(newId);
        }

        setIsEditing(false);
        return;
      }

      if (!selectedCard) return;

      await updateCard(selectedCard.id, payload);
      onCardUpdated?.();
      toastSuccess?.("カードを更新しました");
      setIsEditing(false);
    } catch (e) {
      console.error("カード保存に失敗しました:", e);
      const message = e instanceof Error ? e.message : "カード保存に失敗しました";
      toastError?.(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTags = async (nextTags: string[]) => {
    if (isEditing) {
      setDraft((prev) => (prev ? { ...prev, tags: nextTags } : prev));
      return;
    }
    if (!selectedCard) return;
    // 名前 → ID変換してtagIdsのみ更新
    const resolved = await Promise.all(nextTags.map(name => addTag(name)));
    await updateCard(selectedCard.id, { tagIds: resolved.map(t => t.id) });
    onCardUpdated?.();
  };

  const handleToggleDraft = async (nextIsDraft: boolean) => {
    if (isEditing) {
      setDraft((prev) => (prev ? { ...prev, isDraft: nextIsDraft } : prev));
      return;
    }
    if (!selectedCard) return;
    await updateCard(selectedCard.id, { isDraft: nextIsDraft });
    onCardUpdated?.();
  };

  const handleUpdateTitle = async (nextTitle: string) => {
    if (isEditing) {
      setDraft((prev) => (prev ? { ...prev, title: nextTitle } : prev));
      return;
    }
    if (!selectedCard) return;
    await updateCard(selectedCard.id, { title: nextTitle });
    onCardUpdated?.();
  };

  const getSideBlocks = (side: "question" | "answer") =>
    side === "question" ? (draft?.questionBlocks ?? []) : (draft?.answerBlocks ?? []);

  const setSideBlocks = (side: "question" | "answer", nextBlocks: CardBlock[]) => {
    allowAutoMinHeightSyncRef.current = true;
    setDraft((prev) => {
      if (!prev) return prev;
      const reindexed = normalizeOrderIndex(nextBlocks);
      return side === "question" ? { ...prev, questionBlocks: reindexed } : { ...prev, answerBlocks: reindexed };
    });
  };

  const setLayoutRows = useCallback((nextRows: number) => {
    const safeRows = normalizeLayoutRows(nextRows);
    setDraft((prev) => (prev ? { ...prev, layoutRows: safeRows } : prev));
  }, []);

  const scheduleLayoutRowsFromHeight = useCallback(
    (nextHeightPx: number) => {
      const currentRows = layoutRowsRef.current;
      const currentHeightPx = layoutRowsToCardHeightPx(currentRows);
      const rawRows = (nextHeightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX;
      const requestedRows = normalizeLayoutRows(
        nextHeightPx < currentHeightPx ? Math.floor(rawRows) : cardHeightPxToLayoutRows(nextHeightPx)
      );
      const nextRows = Math.max(requestedRows, getRequiredMinRows());
      pendingRowsRef.current = nextRows;

      if (rowsRafRef.current != null) return;
      rowsRafRef.current = window.requestAnimationFrame(() => {
        rowsRafRef.current = null;
        const pending = pendingRowsRef.current;
        pendingRowsRef.current = null;
        if (pending == null) return;
        setLayoutRows(pending);
      });
    },
    [getRequiredMinRows, setLayoutRows]
  );

  const handleSideMinHeightChange = useCallback(
    (side: "question" | "answer", minHeightPx: number) => {
      minHeightPxBySideRef.current[side] = Math.max(0, minHeightPx);
      if (manualResizeInProgressRef.current) return;
      if (!allowAutoMinHeightSyncRef.current) return;
      const requiredRows = getRequiredMinRows();

      setDraft((prev) => {
        if (!prev) return prev;
        if (prev.layoutRows >= requiredRows) return prev;
        return { ...prev, layoutRows: requiredRows };
      });
    },
    [getRequiredMinRows]
  );

  const handleQuestionMinHeightChange = useCallback(
    (minHeightPx: number) => handleSideMinHeightChange("question", minHeightPx),
    [handleSideMinHeightChange]
  );

  const handleAnswerMinHeightChange = useCallback(
    (minHeightPx: number) => handleSideMinHeightChange("answer", minHeightPx),
    [handleSideMinHeightChange]
  );

  useEffect(() => {
    return () => {
      if (rowsRafRef.current != null) {
        window.cancelAnimationFrame(rowsRafRef.current);
        rowsRafRef.current = null;
      }
    };
  }, []);

  const upsertSingleBlock = (side: "question" | "answer", type: CardBlock["type"], payload: Partial<CardBlock>) => {
    const uniqueId =
      typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const blocks = getSideBlocks(side);
    const index = blocks.findIndex((block) => block.type === type);

    if (index >= 0) {
      const next = [...blocks];
      next[index] = { ...next[index], ...payload };
      setSideBlocks(side, next);
      return;
    }

    const nextBlock: CardBlock = {
      id: `${side}-${type}-${uniqueId}`,
      type,
      orderIndex: blocks.length,
      content: "",
      ...payload,
    } as CardBlock;

    setSideBlocks(side, [...blocks, nextBlock]);
  };

  const removeBlockByTypeIfExists = (side: "question" | "answer", type: CardBlock["type"]) => {
    const blocks = getSideBlocks(side);
    setSideBlocks(
      side,
      blocks.filter((block) => block.type !== type)
    );
  };

  // --- 画像ダイアログ（questionImages / answerImages フィールドを直接操作） ---
  const getDialogImages = (side: "question" | "answer"): UploadedImage[] =>
    (side === "question" ? draft?.questionImages : draft?.answerImages) ?? [];

  const setDialogImages = (side: "question" | "answer", images: UploadedImage[]) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return side === "question" ? { ...prev, questionImages: images } : { ...prev, answerImages: images };
    });
  };

  // --- 音声ダイアログ（audio ブロックを操作） ---
  const getDialogAudios = (side: "question" | "answer") => {
    const block = getSideBlocks(side).find((b) => b.type === "audio");
    return (block?.audios ?? []) as unknown as (string | UploadedImage)[];
  };

  const setDialogAudios = (side: "question" | "answer", items: unknown[]) => {
    if (!items || items.length === 0) {
      removeBlockByTypeIfExists(side, "audio");
      return;
    }
    upsertSingleBlock(side, "audio", { audios: items });
  };

  // --- リンクダイアログ（reference ブロックを操作） ---
  const getReferenceItems = (side: "question" | "answer"): ReferenceBlockData[] => {
    const block = getSideBlocks(side).find((b) => b.type === "reference");
    return (block?.references ?? []) as ReferenceBlockData[];
  };

  const setReferenceItems = (side: "question" | "answer", refs: ReferenceBlockData[]) => {
    const nextRefs = refs ?? [];
    if (nextRefs.length === 0) {
      removeBlockByTypeIfExists(side, "reference");
      return;
    }
    // ポップアップ編集中は空行も保持（保存時に正規化して落とす）
    upsertSingleBlock(side, "reference", { references: nextRefs });
  };

  const getImageCount = (side: "question" | "answer") =>
    getDialogImages(side).length;

  const getAudioCount = (side: "question" | "answer") =>
    getSideBlocks(side).filter((b) => b.type === "audio").reduce((sum, b) => sum + (b.audios?.length ?? 0), 0);

  const getLinkCount = (side: "question" | "answer") =>
    getSideBlocks(side)
      .filter((b) => b.type === "reference")
      .reduce((sum, b) => sum + (sanitizeReferences((b as any)?.references ?? []).length ?? 0), 0);

  const renderMediaDialogButtons = (side: "question" | "answer") => {
    const imageCount = getImageCount(side);
    const audioCount = getAudioCount(side);
    const linkCount = getLinkCount(side);

    const base =
      "inline-flex shrink-0 items-center justify-center gap-1 rounded-full h-7 min-h-0 min-w-0 px-2 text-[10px] font-bold leading-none whitespace-nowrap";

    const openLinkDialog = () => {
      if (getReferenceItems(side).length === 0) {
        setReferenceItems(side, [{ url: "", name: "" }]);
      }
      setLinkDialogSide(side);
    };

    return (
      <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={cn(base, "bg-slate-50 text-slate-500 hover:bg-slate-100")}
          onClick={() => setImageDialogSide(side)}
          aria-label="画像を追加"
        >
          <ImageIcon className="w-3 h-3 shrink-0" />
          <Plus className="w-3 h-3 shrink-0" />
          {imageCount > 0 ? <span>x{imageCount}</span> : null}
        </button>

        <button
          type="button"
          className={cn(base, "bg-slate-50 text-slate-500 hover:bg-slate-100")}
          onClick={() => setAudioDialogSide(side)}
          aria-label="音声を追加"
        >
          <Volume2Icon className="w-3 h-3 shrink-0" />
          <Plus className="w-3 h-3 shrink-0" />
          {audioCount > 0 ? <span>x{audioCount}</span> : null}
        </button>

        <button
          type="button"
          className={cn(base, "bg-slate-50 text-slate-500 hover:bg-slate-100")}
          onClick={openLinkDialog}
          aria-label="リンクを追加"
        >
          <LinkIcon className="w-3 h-3 shrink-0" />
          {linkCount > 0 ? <span>x{linkCount}</span> : <Plus className="w-3 h-3 shrink-0" />}
        </button>
      </div>
    );
  };


  const onDragEnd = (result: DndResult) => {
    if (!draft) return;
    if (!result.destination) return;
    allowAutoMinHeightSyncRef.current = true;

    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const listFor = (id: string) => {
      if (id === "question-blocks") return [...draft.questionBlocks];
      return [...draft.answerBlocks];
    };

    // same list
    if (source.droppableId === destination.droppableId) {
      const list = listFor(source.droppableId);
      const [moved] = list.splice(source.index, 1);
      list.splice(destination.index, 0, moved);

      const re = normalizeOrderIndex(list as CardBlock[]);
      setDraft((prev) => {
        if (!prev) return prev;
        return source.droppableId === "question-blocks" ? { ...prev, questionBlocks: re } : { ...prev, answerBlocks: re };
      });
      return;
    }

    // cross list（id の side プレフィックスも整合させる）
    const sourceList = listFor(source.droppableId);
    const destList = listFor(destination.droppableId);

    const [rawMoved] = sourceList.splice(source.index, 1);
    const nextSide: "question" | "answer" = destination.droppableId === "question-blocks" ? "question" : "answer";
    const maybeNewId = normalizeCrossSideId((rawMoved as any)?.id, nextSide);
    const moved = maybeNewId ? { ...(rawMoved as any), id: maybeNewId } : rawMoved;

    destList.splice(destination.index, 0, moved);

    const reS = normalizeOrderIndex(sourceList as CardBlock[]);
    const reD = normalizeOrderIndex(destList as CardBlock[]);

    setDraft((prev) => {
      if (!prev) return prev;
      const next: EditorDraft = { ...prev };

      if (source.droppableId === "question-blocks") next.questionBlocks = reS;
      else next.answerBlocks = reS;

      if (destination.droppableId === "question-blocks") next.questionBlocks = reD;
      else next.answerBlocks = reD;

      return next;
    });
  };

  const panelCard = useMemo(() => {
    if (selectedCard) {
      if (!isEditing || !draft) return selectedCard;
      return {
        ...selectedCard,
        title: draft.title,
        tags: draft.tags,
        isDraft: draft.isDraft,
        layoutRows: draft.layoutRows,
      };
    }
    if (!draft) return null;

    const now = new Date();
    return {
      id: "__draft__",
      userId: "",
      deviceId: "web",
      folderId: "",
      orderIndex: 0,
      questionNumber: "",
      title: draft.title,
      tags: draft.tags,
      isDraft: draft.isDraft,
      isDeleted: false,
      hasUncertainty: false,
      isBookmarked: false,
      isCompleted: false,
      isSilent: false,
      questionText: "",
      questionImages: [],
      questionAudios: [],
      questionMarked: "",
      answerText: "",
      answerImages: [],
      answerAudios: [],
      answerMarked: "",
      memoryStability: 0,
      nextReviewDate: now,
      createdAt: now,
      updatedAt: now,
      reviewLogs: [],
      layoutRows: draft.layoutRows,
    } as any;
  }, [selectedCard, isEditing, draft]);

  // --- 表示分岐（チラつき防止） ---

  // 未選択
  if (!normalizedSelectedCardId && !isEditing) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-bold">左のツリーからカードを選択してください</p>
          <p className="text-xs mt-2 opacity-70">カードをクリックすると閲覧できます</p>

          <div className="mt-6">
            <Button type="button" className="h-10 rounded-full px-5" onClick={handleStartNew}>
              <Plus className="w-4 h-4 mr-2" />
              新規カードを作成
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 新規IDはあるが編集してない（キャンセル直後など）
  if (isNew && !isEditing) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="text-center">
          <p className="text-sm font-bold">新規カードを作成します</p>
          <p className="text-xs mt-2 opacity-70">「作成開始」を押して編集を始めてください</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button type="button" className="h-10 rounded-full px-5" onClick={() => setIsEditing(true)}>
              <Plus className="w-4 h-4 mr-2" />
              作成開始
            </Button>
            <Button type="button" variant="ghost" className="h-10 rounded-full px-5" onClick={handleCancel}>
              戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 既存カード選択済みだがロード中
  if (!isNew && normalizedSelectedCardId && !selectedCard && !isEditing) {
    return <div className="h-full p-4 text-slate-400">Loading...</div>;
  }

  // 編集開始直後に draft が未初期化の1フレームを安全に吸収
  if (isEditing && !draft) {
    return <div className="h-full p-4 text-slate-400">Loading...</div>;
  }

  return (
    <div className="h-full pl-4 py-4 card-editor-right-pane-font">
      <div className="relative flex h-full overflow-hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-3 z-20 h-8 w-8 rounded-full bg-white/90 shadow-sm"
          style={{
            right: isMetaOpen ? "20rem" : "0",
            transform: "translateX(50%)",
          }}
          onClick={() => setIsMetaOpen((prev) => !prev)}
          aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
        >
          {isMetaOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className={cn("min-w-0 flex-1 p-4", isEditing ? "overflow-y-auto" : "overflow-hidden")}>
          {isEditing ? (
            <div className="space-y-4">
              {/* 右ペイン用の最小ヘッダ（保存/キャンセルだけ） */}
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" className="h-9 rounded-full px-4" onClick={handleCancel} disabled={isSaving}>
                    キャンセル
                  </Button>

                  <Button type="button" className="h-9 rounded-full px-6" onClick={handleSave} disabled={isSaving}>
                    保存
                  </Button>
                </div>
              </div>

              {/* ★紙カード2枚並び編集 */}
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                  {/* 問題 */}
                  <div className="flex flex-col gap-2 w-full min-h-0">
                    <div className="shrink-0 flex justify-center">
                      <div ref={toolbarMountRefQ} />
                    </div>
                    <CardFrame
                      baseWidth={CANONICAL_CARD_WIDTH}
                      className={cn("premium-paper-depth", "card-shell--paper")}
                      resizable
                      showResizeHandle
                      resizeStepPx={CARD_ROW_PX}
                      heightPx={layoutRowsToCardHeightPx(normalizeLayoutRows(draft?.layoutRows))}
                      lockHeight
                      onHeightChange={scheduleLayoutRowsFromHeight}
                      onMinHeightChange={handleQuestionMinHeightChange}
                      onResizeStart={() => {
                        manualResizeInProgressRef.current = true;
                      }}
                      onResizeEnd={() => {
                        manualResizeInProgressRef.current = false;
                      }}
                      actionsTopLeft={editorActionsTopLeft}
                      actionsTopRight={renderMediaDialogButtons("question")}
                    >
                      <SharedCardContent
                        mode="edit"
                        blocks={draft?.questionBlocks ?? []}
                        onChange={(blocks) => setSideBlocks("question", blocks)}
                        prefix="question"
                        label="問題"
                        color="text-indigo-500"
                        droppableId="question-blocks"
                        accentColor={settings?.accentColor}
                        duplicateToOpposite={settings?.duplicateToOpposite}
                        toolbarMountRef={toolbarMountRefQ}
                      />
                    </CardFrame>
                  </div>

                  {/* 解答 */}
                  <div className="flex flex-col gap-2 w-full min-h-0">
                    <div className="shrink-0 flex justify-center">
                      <div ref={toolbarMountRefA} />
                    </div>
                    <CardFrame
                      baseWidth={CANONICAL_CARD_WIDTH}
                      className={cn("premium-paper-depth", "card-shell--paper")}
                      resizable
                      showResizeHandle
                      resizeStepPx={CARD_ROW_PX}
                      heightPx={layoutRowsToCardHeightPx(normalizeLayoutRows(draft?.layoutRows))}
                      lockHeight
                      onHeightChange={scheduleLayoutRowsFromHeight}
                      onMinHeightChange={handleAnswerMinHeightChange}
                      onResizeStart={() => {
                        manualResizeInProgressRef.current = true;
                      }}
                      onResizeEnd={() => {
                        manualResizeInProgressRef.current = false;
                      }}
                      actionsTopLeft={editorActionsTopLeft}
                      actionsTopRight={renderMediaDialogButtons("answer")}
                    >
                      <SharedCardContent
                        mode="edit"
                        blocks={draft?.answerBlocks ?? []}
                        onChange={(blocks) => setSideBlocks("answer", blocks)}
                        prefix="answer"
                        label="解答"
                        color="text-emerald-500"
                        droppableId="answer-blocks"
                        accentColor={settings?.accentColor}
                        duplicateToOpposite={settings?.duplicateToOpposite}
                        toolbarMountRef={toolbarMountRefA}
                      />
                    </CardFrame>
                  </div>
                </div>
              </DragDropContext>
            </div>
          ) : (
            selectedCard && (
              <Flashcard
                card={selectedCard}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped((p) => !p)}
                onToggleBookmark={handleToggleBookmark}
                onToggleUncertainty={handleToggleUncertainty}
                showNavigation={false}
                onEdit={() => {
                  setIsFlipped(false);
                  setIsEditing(true);
                }}
              />
            )
          )}
        </div>

        {isMetaOpen && (
          <CardMetaPanel
            card={panelCard}
            reviewLogs={panelCard?.reviewLogs ?? []}
            onUpdateTags={handleUpdateTags}
            onToggleDraft={handleToggleDraft}
            onUpdateTitle={handleUpdateTitle}
          />
        )}
      </div>

      <Dialog modal={false} open={Boolean(imageDialogSide)} onOpenChange={(open) => !open && setImageDialogSide(null)}>
        <DialogContent nonModal className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>画像を追加</DialogTitle>
          </DialogHeader>
          {imageDialogSide && (
            <MediaUploader
              type="image"
              urls={getDialogImages(imageDialogSide)}
              onChange={(next) => setDialogImages(imageDialogSide, next as UploadedImage[])}
              maxFiles={10}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(audioDialogSide)} onOpenChange={(open) => !open && setAudioDialogSide(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>音声を追加</DialogTitle>
          </DialogHeader>
          {audioDialogSide && (
            <MediaUploader
              type="audio"
              urls={getDialogAudios(audioDialogSide)}
              onChange={(next) => setDialogAudios(audioDialogSide, next as unknown[])}
              maxFiles={10}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(linkDialogSide)} onOpenChange={(open) => !open && setLinkDialogSide(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>リンクを追加</DialogTitle>
          </DialogHeader>
          {linkDialogSide && (
            <LinkEditor items={getReferenceItems(linkDialogSide)} onChange={(next) => setReferenceItems(linkDialogSide, next)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkEditor({
  items,
  onChange,
}: {
  items: ReferenceBlockData[];
  onChange: (items: ReferenceBlockData[]) => void;
}) {
  const refs = items ?? [];

  const add = () => onChange([...refs, { url: "", name: "" }]);
  const update = (index: number, patch: Partial<ReferenceBlockData>) => {
    const next = [...refs];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const remove = (index: number) => {
    onChange(refs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {refs.map((ref, index) => (
        <div key={index} className="relative bg-white p-2 rounded-xl border border-slate-100 shadow-sm group/link">
          <button
            type="button"
            onClick={() => remove(index)}
            className="absolute -top-1 -right-1 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover/link:opacity-100 transition-opacity z-20 shadow-sm"
          >
            <span className="sr-only">削除</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400">
              <LinkIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 flex gap-2">
              <Input
                value={ref.url ?? ""}
                onChange={(e) => update(index, { url: e.target.value })}
                placeholder="URL (https://...)"
                autoComplete="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                className="h-8 text-[11px] rounded-lg border-slate-100 bg-slate-50/30 focus-visible:ring-primary-100 flex-[3]"
                autoFocus={index === refs.length - 1}
              />
              <Input
                value={ref.name ?? ""}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="表示名"
                autoComplete="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                className="h-8 text-[11px] rounded-lg border-slate-100 bg-slate-50/30 focus-visible:ring-primary-100 flex-[2]"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className={cn(
          "w-full h-8 border-dashed border-2 text-slate-400 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50/30 rounded-xl font-bold flex items-center justify-center gap-2 text-[11px] transition-all",
          refs.length > 0 ? "mt-1.5 border-slate-100 bg-slate-50/10" : "border-slate-200"
        )}
      >
        <Plus className="w-3 h-3" />
        <span>{refs.length > 0 ? "リンクを追加" : "リンクを設定"}</span>
      </Button>
    </div>
  );
}
