import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, PanelRightClose, PanelRightOpen, Plus } from "lucide-react";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Volume2Icon from "lucide-react/dist/esm/icons/volume-2";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import { DragDropContext } from "@hello-pangea/dnd";

import { Flashcard } from "@/Components/card/Flashcard";
import { BlockEditor } from "@/Components/card/BlockEditor";
import { CardMetaPanel } from "@/Components/card/CardMetaPanel";
import MediaUploader from "@/Components/card/MediaUploader";
import { CardFrame } from "@/Components/card/frame/CardFrame";
import { CardCornerActions } from "@/Components/card/frame/CardCornerActions";

import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { useCards } from "@/hooks/useCards";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useToast } from "@/contexts/ToastContext";

import type { CardBlock, ReferenceBlockData } from "@/types";

type DndLocation = { droppableId: string; index: number };
type DndResult = { source: DndLocation; destination?: DndLocation | null };

interface CardEditorPaneProps {
  selectedCardId: string | null;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
}

export function CardEditorPane({ selectedCardId, onCardUpdated, onSelectCardId }: CardEditorPaneProps) {
  const { settings, updateSettings } = useUserSettings();
  const { success: toastSuccess, error: toastError } = useToast();

  // ★重要：createCard が無い場合はここだけあなたの実装名に合わせて変更
  const { cards, updateCard, createCard } = useCards() as any;

  const isNew =
    selectedCardId === "new" ||
    selectedCardId === "__new__" ||
    selectedCardId === "NEW" ||
    selectedCardId === "create";

  const selectedCard = useMemo(() => {
    if (!selectedCardId || isNew) return null;
    return cards.find((c: any) => c.id === selectedCardId) ?? null;
  }, [cards, selectedCardId, isNew]);

  // 閲覧状態
  const [isFlipped, setIsFlipped] = useState(false);

  // 編集状態（右ペイン内）
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageDialogSide, setImageDialogSide] = useState<"question" | "answer" | null>(null);
  const [audioDialogSide, setAudioDialogSide] = useState<"question" | "answer" | null>(null);
  const [linkDialogSide, setLinkDialogSide] = useState<"question" | "answer" | null>(null);
  // 差分1: 編集中の対象IDを固定して、cards更新時のdraft上書きを防ぐ
  const editingCardIdRef = useRef<string | null>(null);
  const wasEditingRef = useRef(false);
  // 差分2: 高さ保存のI/Oはdebounceで間引く
  const heightPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 裏表共通のカード高さ（null = CardShell 内部自動計算）
  const [cardHeightPx, setCardHeightPx] = useState<number | null>(null);
  const [isMetaOpen, setIsMetaOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("card-editor.meta-panel-open") !== "false";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("card-editor.meta-panel-open", String(isMetaOpen));
  }, [isMetaOpen]);

  // Settings からの高さを同期
  useEffect(() => {
    if (settings?.cardEditorHeightPx != null) {
      setCardHeightPx(settings.cardEditorHeightPx);
    } else if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('card-editor.resize:shared-height');
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        setCardHeightPx(parsed);
      }
    }
  }, [settings?.cardEditorHeightPx]);

  const persistHeight = useCallback(
    (newHeight: number) => {
      setCardHeightPx(newHeight);
      if (heightPersistTimerRef.current) {
        clearTimeout(heightPersistTimerRef.current);
      }
      heightPersistTimerRef.current = setTimeout(() => {
        updateSettings({ cardEditorHeightPx: newHeight });
        if (typeof window !== "undefined") {
          window.localStorage.setItem("card-editor.resize:shared-height", String(newHeight));
        }
      }, 150);
    },
    [updateSettings]
  );

  useEffect(() => {
    return () => {
      if (heightPersistTimerRef.current) {
        clearTimeout(heightPersistTimerRef.current);
      }
    };
  }, []);

  // ツールバーの外部マウント先（問題・解答 各カードの上）
  const toolbarMountRefQ = useRef<HTMLDivElement | null>(null);
  const toolbarMountRefA = useRef<HTMLDivElement | null>(null);

  // 編集用ドラフト（右ペイン内で完結）
  const [draft, setDraft] = useState<{
    title: string;
    tags: string[];
    isDraft: boolean;
    questionBlocks: CardBlock[];
    answerBlocks: CardBlock[];
  } | null>(null);

  const initNewDraft = useCallback(() => {
    setDraft({
      title: "",
      tags: [],
      isDraft: true,
      questionBlocks: [],
      answerBlocks: [],
    });
  }, []);

  useEffect(() => {
    if (isEditing && !isNew && !draft) {
      initNewDraft();
    }
  }, [isEditing, isNew, draft, initNewDraft]);

  useEffect(() => {
    if (isEditing && !wasEditingRef.current) {
      editingCardIdRef.current = isNew ? "__new__" : selectedCardId;
    } else if (!isEditing) {
      editingCardIdRef.current = null;
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, isNew, selectedCardId]);

  // カード切替時またはロード完了時にドラフトをロード
  useEffect(() => {
    // IDが完全に切り替わった場合（null/別のカード/新規）は、編集状態と反転状態をリセット
    // ※依存配列に selectedCardId だけを入れて「切り替わり」だけを検知する手法もあるが、
    // ここではデータのロード完了を待つ必要がある。
    
    // 最優先: IDが null なら必ず編集解除
    if (!selectedCardId) {
      setIsFlipped(false);
      setIsEditing(false);
      setDraft(null);
      editingCardIdRef.current = null;
      return;
    }

    // データがまだロードされていない場合は何もしない（ロード完了後に再度呼ばれる）
    if (!isNew && !selectedCard) {
      return;
    }

    // 以前の selectedCardId を保持して、本当に切り替わった時だけ編集を閉じる設計も可能だが、
    // 現状は selectedCardId が依存配列にあるため、切り替わり時にここが走る。

    const currentEditorTargetId = isNew ? "__new__" : selectedCardId;
    // 差分3: 同じ編集中IDならcards更新でもdraftを保持
    if (isEditing && draft && editingCardIdRef.current === currentEditorTargetId) {
      return;
    }

    setIsFlipped(false);

    // 新規モード
    if (isNew) {
      if (!draft) {
        initNewDraft();
      }
      setIsEditing(true);
      return;
    }

    // ロードされたデータをドラフトに反映
    if (selectedCard) {
      setDraft({
        title: selectedCard.title ?? "",
        tags: selectedCard.tags ?? [],
        isDraft: selectedCard.isDraft ?? true,
        questionBlocks: (selectedCard.questionBlocks ?? []) as CardBlock[],
        answerBlocks: (selectedCard.answerBlocks ?? []) as CardBlock[],
      });
    } else {
      setDraft(null);
    }
  }, [selectedCardId, selectedCard, isNew, isEditing, draft, initNewDraft]);

  // 閲覧側のトグル（既存カードのみ）
  const handleToggleBookmark = async (card: any) => {
    try {
      await updateCard(card.id, { isBookmarked: !card.isBookmarked });
      onCardUpdated?.();
    } catch (error) {
      console.error("ブックマークの更新に失敗しました:", error);
    }
  };

  const handleToggleUncertainty = async (card: any) => {
    try {
      await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
      onCardUpdated?.();
    } catch (error) {
      console.error("不確証マークの更新に失敗しました:", error);
    }
  };

  // 編集画面用の actionsTopLeft（星・はてなボタン）
  // CardShell の card-shell-body pt-12 と同じ高さの領域に表示され、閲覧画面と同じ位置になる
  const editorActionsTopLeft = selectedCard ? (
    <CardCornerActions
      onHelp={() => handleToggleUncertainty(selectedCard)}
      onStar={() => handleToggleBookmark(selectedCard)}
      helpActive={selectedCard.hasUncertainty ?? false}
      starActive={selectedCard.isBookmarked ?? false}
    />
  ) : undefined;

  const resetDraftFromCard = () => {
    if (isNew) {
      initNewDraft();
      return;
    }
    if (!selectedCard) return;

    setDraft({
      title: selectedCard.title ?? "",
      tags: selectedCard.tags ?? [],
      isDraft: selectedCard.isDraft ?? true,
      questionBlocks: (selectedCard.questionBlocks ?? []) as CardBlock[],
      answerBlocks: (selectedCard.answerBlocks ?? []) as CardBlock[],
    });
  };

  const handleSave = async () => {
    if (!draft) return;

    try {
      setIsSaving(true);

      const payload = {
        title: draft.title,
        tags: draft.tags,
        isDraft: draft.isDraft,
        questionBlocks: draft.questionBlocks,
        answerBlocks: draft.answerBlocks,
      };

      if (isNew) {
        if (typeof createCard !== "function") {
          console.error(
            "[CardEditorPane] createCard が useCards にありません。useCards の作成関数名に合わせて置き換えてください。"
          );
          toastError?.("カードの作成関数が見つかりません");
          return;
        }

        const created = await createCard(payload);
        const newId =
          (typeof created === "object" && created !== null && "id" in created && (created as any).id) ||
          (typeof created === "string" ? created : null);
        onCardUpdated?.();
        toastSuccess?.("カードを作成しました");
        if (newId && typeof onSelectCardId === "function") {
          onSelectCardId(newId);
        }

        // 新規作成後は編集を閉じる（親が新ID選択できる場合は onSelectCardId で追従）
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
      toastError?.("カード保存に失敗しました");
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
    await updateCard(selectedCard.id, { tags: nextTags });
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
    setDraft((prev) => {
      if (!prev) return prev;
      const reindexed = nextBlocks.map((block, index) => ({ ...block, orderIndex: index }));
      return side === "question"
        ? { ...prev, questionBlocks: reindexed }
        : { ...prev, answerBlocks: reindexed };
    });
  };

  const upsertSingleBlock = (
    side: "question" | "answer",
    type: CardBlock["type"],
    payload: Partial<CardBlock>
  ) => {
    const uniqueId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
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

  const getMediaItems = (side: "question" | "answer", type: "image" | "audio") => {
    const block = getSideBlocks(side).find((b) => b.type === type);
    if (type === "image") return (block?.images ?? []) as any[];
    return (block?.audios ?? []) as any[];
  };

  const getReferenceItems = (side: "question" | "answer"): ReferenceBlockData[] => {
    const block = getSideBlocks(side).find((b) => b.type === "reference");
    return (block?.references ?? []) as ReferenceBlockData[];
  };

  const setMediaItems = (side: "question" | "answer", type: "image" | "audio", items: any[]) => {
    if (!items || items.length === 0) {
      removeBlockByTypeIfExists(side, type);
      return;
    }
    if (type === "image") {
      upsertSingleBlock(side, "image", { images: items });
      return;
    }
    upsertSingleBlock(side, "audio", { audios: items });
  };

  const setReferenceItems = (side: "question" | "answer", refs: ReferenceBlockData[]) => {
    const nextRefs = refs ?? [];
    if (nextRefs.length === 0) {
      removeBlockByTypeIfExists(side, "reference");
      return;
    }
    // ポップアップ編集中は空行（未入力リンク）も保持する。
    // これを即時除去すると「リンクを設定」を押しても何も起きないように見えるため。
    upsertSingleBlock(side, "reference", { references: nextRefs });
  };

  const getBadgeCount = (side: "question" | "answer", kind: "image" | "audio" | "reference") => {
    const blocks = getSideBlocks(side);
    if (kind === "image") {
      return blocks
        .filter((b) => b.type === "image")
        .reduce((sum, b) => sum + (b.images?.length ?? 0), 0);
    }
    if (kind === "audio") {
      return blocks
        .filter((b) => b.type === "audio")
        .reduce((sum, b) => sum + (b.audios?.length ?? 0), 0);
    }
    return blocks
      .filter((b) => b.type === "reference")
      .reduce(
        (sum, b) =>
          sum +
          (b.references?.filter((r) => (r?.url ?? "").trim() || (r?.name ?? "").trim()).length ?? 0),
        0
      );
  };

  const renderMediaDialogButtons = (side: "question" | "answer") => {
    const imageCount = getBadgeCount(side, "image");
    const audioCount = getBadgeCount(side, "audio");
    const linkCount = getBadgeCount(side, "reference");
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
          title="画像を追加"
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
          title="音声を追加"
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
          title="リンクを追加"
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

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const getList = (id: string) => {
      if (id === "question-blocks") return [...draft.questionBlocks];
      return [...draft.answerBlocks];
    };

    // same list
    if (source.droppableId === destination.droppableId) {
      const list = getList(source.droppableId);
      const [moved] = list.splice(source.index, 1);
      list.splice(destination.index, 0, moved);

      const re = list.map((b: any, i: number) => ({ ...b, orderIndex: i }));

      setDraft((prev) => {
        if (!prev) return prev;
        return source.droppableId === "question-blocks"
          ? { ...prev, questionBlocks: re as CardBlock[] }
          : { ...prev, answerBlocks: re as CardBlock[] };
      });
      return;
    }

    // cross list
    const sourceList = getList(source.droppableId);
    const destList = getList(destination.droppableId);

    const [moved] = sourceList.splice(source.index, 1);
    destList.splice(destination.index, 0, moved);

    const reS = sourceList.map((b: any, i: number) => ({ ...b, orderIndex: i }));
    const reD = destList.map((b: any, i: number) => ({ ...b, orderIndex: i }));

    setDraft((prev) => {
      if (!prev) return prev;

      const next: any = { ...prev };

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
      return { ...selectedCard, title: draft.title, tags: draft.tags, isDraft: draft.isDraft };
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
    } as any;
  }, [selectedCard, isEditing, draft]);

  // 未選択時（新規作成もここからできるようにする）
  if ((!selectedCardId || !selectedCard) && !isNew && !isEditing) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-bold">左のツリーからカードを選択してください</p>
          <p className="text-xs mt-2 opacity-70">カードをクリックすると閲覧できます</p>

          <div className="mt-6">
            <Button
              type="button"
              className="h-10 rounded-full px-5"
              onClick={() => {
                initNewDraft();
                setIsEditing(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新規カードを作成
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 編集開始直後に draft が未初期化の1フレームを安全に吸収
  if (isEditing && !draft) {
    return <div className="h-full p-4 text-slate-400">Loading...</div>;
  }

  return (
    <div className="h-full p-4">
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
          title={isMetaOpen ? "close meta panel" : "open meta panel"}
          aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
        >
          {isMetaOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
        <div className={cn("min-w-0 flex-1 p-4", isEditing ? "overflow-y-auto" : "overflow-hidden")}>
          {isEditing ? (
            <div className="space-y-4">
          {/* 右ペイン用の最小ヘッダ（保存/キャンセルだけ） */}
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-full px-4"
                onClick={() => {
                  resetDraftFromCard();
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                キャンセル
              </Button>

              <Button
                type="button"
                className="h-9 rounded-full px-6"
                onClick={handleSave}
                disabled={isSaving}
              >
                保存
              </Button>
            </div>
          </div>

          {/* ★紙カード2枚並び編集 */}
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {/* 問題 */}
              <div className="flex flex-col gap-2 w-full">
                {/* ツールバーのマウント先（カードの外側に表示） */}
                <div ref={toolbarMountRefQ} />
                <CardFrame
                  className={cn(
                    "overflow-hidden shadow-xl",
                    "premium-paper-depth",
                    "card-shell--paper"
                  )}
                  resizable={true}
                  showResizeHandle={true}
                  bodyOverflowY="auto"
                  heightPx={cardHeightPx ?? undefined}
                  onHeightChange={(newHeight) => persistHeight(newHeight)}
                  actionsTopLeft={editorActionsTopLeft}
                  actionsTopRight={renderMediaDialogButtons("question")}
                >
                  <BlockEditor
                    blocks={draft?.questionBlocks ?? []}
                    onChange={(blocks) => setSideBlocks("question", blocks as CardBlock[])}
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
              <div className="flex flex-col gap-2 w-full">
                {/* ツールバーのマウント先（カードの外側に表示） */}
                <div ref={toolbarMountRefA} />
                <CardFrame
                  className={cn(
                    "shadow-xl",
                    "bg-white"
                  )}
                  resizable={true}
                  showResizeHandle={true}
                  bodyOverflowY="auto"
                  heightPx={cardHeightPx ?? undefined}
                  onHeightChange={(newHeight) => persistHeight(newHeight)}
                  actionsTopLeft={editorActionsTopLeft}
                  actionsTopRight={renderMediaDialogButtons("answer")}
                >
                  <BlockEditor
                    blocks={draft?.answerBlocks ?? []}
                    onChange={(blocks) => setSideBlocks("answer", blocks as CardBlock[])}
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
              editorSharedHeightPx={cardHeightPx}
              lockCardHeight={false}
            />
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

      <Dialog open={Boolean(imageDialogSide)} onOpenChange={(open) => !open && setImageDialogSide(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>画像を追加</DialogTitle>
          </DialogHeader>
          {imageDialogSide && (
            <MediaUploader
              type="image"
              urls={getMediaItems(imageDialogSide, "image")}
              onChange={(next) => setMediaItems(imageDialogSide, "image", next as any[])}
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
              urls={getMediaItems(audioDialogSide, "audio")}
              onChange={(next) => setMediaItems(audioDialogSide, "audio", next as any[])}
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
            <LinkEditor
              items={getReferenceItems(linkDialogSide)}
              onChange={(next) => setReferenceItems(linkDialogSide, next)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
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
            title="リンクを削除"
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
