import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, PanelRightClose, PanelRightOpen, Plus } from "lucide-react";
import Star from "lucide-react/dist/esm/icons/star";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help";
import { DragDropContext } from "@hello-pangea/dnd";

import { Flashcard } from "@/Components/card/Flashcard";
import { BlockEditor } from "@/Components/card/BlockEditor";
import { ScaleToFitFrame } from "@/Components/card/ScaleToFitFrame";
import { CardShell } from "@/Components/card/CardShell";
import { CardSurface } from "@/Components/card/CardSurface";
import { CardMetaPanel } from "@/Components/card/CardMetaPanel";

import { Button } from "@/Components/ui/button";
import { useCards } from "@/hooks/useCards";
import { useUserSettings } from "@/hooks/useUserSettings";

import type { CardBlock } from "@/types";

type DndLocation = { droppableId: string; index: number };
type DndResult = { source: DndLocation; destination?: DndLocation | null };

interface CardEditorPaneProps {
  selectedCardId: string | null;
  onCardUpdated?: () => void;
}

export function CardEditorPane({ selectedCardId, onCardUpdated }: CardEditorPaneProps) {
  const { settings, updateSettings } = useUserSettings();

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

  // ツールバーの外部マウント先（問題・解答 各カードの上）
  const toolbarMountRefQ = useRef<HTMLDivElement | null>(null);
  const toolbarMountRefA = useRef<HTMLDivElement | null>(null);

  // 編集用ドラフト（右ペイン内で完結）
  const [draft, setDraft] = useState<{
    title: string;
    tags: string[];
    questionBlocks: CardBlock[];
    answerBlocks: CardBlock[];
  } | null>(null);

  const initNewDraft = () => {
    setDraft({
      title: "",
      tags: [],
      questionBlocks: [],
      answerBlocks: [],
    });
  };

  // カード切替時またはロード完了時にドラフトをロード
  useEffect(() => {
    // IDが完全に切り替わった場合（null/別のカード/新規）は、編集状態と反転状態をリセット
    // ※依存配列に selectedCardId だけを入れて「切り替わり」だけを検知する手法もあるが、
    // ここではデータのロード完了を待つ必要がある。
    
    // データがまだロードされていない場合は何もしない（ロード完了後に再度呼ばれる）
    if (!isNew && selectedCardId && !selectedCard) {
      return;
    }

    // 以前の selectedCardId を保持して、本当に切り替わった時だけ編集を閉じる設計も可能だが、
    // 現状は selectedCardId が依存配列にあるため、切り替わり時にここが走る。
    
    // 編集中に外部（Syncなど）の cards 一覧が更新された際、勝手に draft を上書きしないためのガード
    if (isEditing && draft && selectedCard && selectedCardId === selectedCard.id) {
      return; 
    }

    setIsFlipped(false);
    
    // IDが null になった場合は編集を解除
    if (!selectedCardId) {
      setIsEditing(false);
      setDraft(null);
      return;
    }

    // 新規モード
    if (isNew) {
      initNewDraft();
      setIsEditing(true);
      return;
    }

    // ロードされたデータをドラフトに反映
    if (selectedCard) {
      setDraft({
        title: selectedCard.title ?? "",
        tags: selectedCard.tags ?? [],
        questionBlocks: (selectedCard.questionBlocks ?? []) as CardBlock[],
        answerBlocks: (selectedCard.answerBlocks ?? []) as CardBlock[],
      });
    } else {
      setDraft(null);
    }
  }, [selectedCardId, selectedCard, isNew]); 

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
    <div className="flex items-center gap-1">
      {/* 不確証(はてな)マーク */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleUncertainty(selectedCard);
        }}
        className={cn(
          "rounded-full w-6 h-6 min-w-0 min-h-0 transition-colors flex items-center justify-center",
          (selectedCard.hasUncertainty ?? false)
            ? "bg-amber-100 text-amber-600 hover:bg-amber-200 border-none"
            : "bg-slate-50/80 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"
        )}
        title="曘昧/要復習"
      >
        <CircleHelp className="w-3 h-3" />
      </button>
      {/* ブックマーク(星)マーク */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleBookmark(selectedCard);
        }}
        className={cn(
          "rounded-full w-6 h-6 min-w-0 min-h-0 transition-colors flex items-center justify-center",
          (selectedCard.isBookmarked ?? false)
            ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border-none"
            : "bg-slate-50/80 text-slate-400 hover:bg-primary-600/10 hover:text-primary-600 border border-transparent"
        )}
        title="ブックマーク"
      >
        <Star className={cn("w-3 h-3", (selectedCard.isBookmarked ?? false) && "fill-current")} />
      </button>
    </div>
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
        questionBlocks: draft.questionBlocks,
        answerBlocks: draft.answerBlocks,
      };

      if (isNew) {
        if (typeof createCard !== "function") {
          console.error(
            "[CardEditorPane] createCard が useCards にありません。useCards の作成関数名に合わせて置き換えてください。"
          );
          return;
        }

        await createCard(payload);
        onCardUpdated?.();

        // 新規作成後は編集を閉じてプレースホルダに戻す（親が新IDを選択してくれるのが理想）
        setIsEditing(false);
        initNewDraft();
        return;
      }

      if (!selectedCard) return;

      await updateCard(selectedCard.id, payload);
      onCardUpdated?.();
      setIsEditing(false);
    } catch (e) {
      console.error("カード保存に失敗しました:", e);
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
      return { ...selectedCard, tags: draft.tags };
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
      isDraft: true,
      isDeleted: false,
      hasUncertainty: false,
      isBookmarked: false,
      isCompleted: false,
      isSilent: false,
      questionText: "",
      questionImages: [],
      questionAudios: [],
      questionMemo: "",
      questionMarked: "",
      answerText: "",
      answerImages: [],
      answerAudios: [],
      answerMemo: "",
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

  // draft が無いのに編集に入った場合の保険
  if (!draft) {
    initNewDraft();
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
        <div className="min-w-0 flex-1 overflow-hidden p-4">
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
                <ScaleToFitFrame baseWidth={480}>
                  <CardShell
                    className={cn(
                      "mx-auto border-none rounded-[32px] md:rounded-[40px] overflow-hidden shadow-xl",
                      "premium-paper-depth",
                      "card-shell--paper"
                    )}
                    resizable={true}
                    showResizeHandle={true}
                    bodyOverflowY="auto"
                    heightPx={cardHeightPx ?? undefined}
                    onHeightChange={(newHeight) => {
                      setCardHeightPx(newHeight);
                      updateSettings({ cardEditorHeightPx: newHeight });
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('card-editor.resize:shared-height', String(newHeight));
                      }
                    }}
                    actionsTopLeft={editorActionsTopLeft}
                  >
                    {/* ruledOffsetPx=24 は BlockEditor の pt-6（24px）に合わせた罫線開始位置 */}
                    <CardSurface ruled={true} ruledRowPx={24} ruledOffsetPx={24}>
                      <BlockEditor
                        blocks={draft?.questionBlocks ?? []}
                        onChange={(blocks) =>
                          setDraft((prev) =>
                            prev ? { ...prev, questionBlocks: blocks as any } : prev
                          )
                        }
                        prefix="question"
                        label="問題"
                        color="text-indigo-500"
                        droppableId="question-blocks"
                        accentColor={settings?.accentColor}
                        duplicateToOpposite={settings?.duplicateToOpposite}
                        toolbarMountRef={toolbarMountRefQ}
                      />
                    </CardSurface>
                  </CardShell>
                </ScaleToFitFrame>
              </div>

              {/* 解答 */}
              <div className="flex flex-col gap-2 w-full">
                {/* ツールバーのマウント先（カードの外側に表示） */}
                <div ref={toolbarMountRefA} />
                <ScaleToFitFrame baseWidth={480}>
                  <CardShell
                    className={cn(
                      "mx-auto border-none rounded-[32px] md:rounded-[40px] shadow-xl",
                      "bg-white"
                    )}
                    resizable={true}
                    showResizeHandle={true}
                    bodyOverflowY="auto"
                    heightPx={cardHeightPx ?? undefined}
                    onHeightChange={(newHeight) => {
                      setCardHeightPx(newHeight);
                      updateSettings({ cardEditorHeightPx: newHeight });
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('card-editor.resize:shared-height', String(newHeight));
                      }
                    }}
                    actionsTopLeft={editorActionsTopLeft}
                  >
                    {/* ruledOffsetPx=24 は BlockEditor の pt-6（24px）に合わせた罫線開始位置 */}
                    <CardSurface ruled={true} ruledRowPx={24} ruledOffsetPx={24}>
                      <BlockEditor
                        blocks={draft?.answerBlocks ?? []}
                        onChange={(blocks) =>
                          setDraft((prev) =>
                            prev ? { ...prev, answerBlocks: blocks as any } : prev
                          )
                        }
                        prefix="answer"
                        label="解答"
                        color="text-emerald-500"
                        droppableId="answer-blocks"
                        accentColor={settings?.accentColor}
                        duplicateToOpposite={settings?.duplicateToOpposite}
                        toolbarMountRef={toolbarMountRefA}
                      />
                    </CardSurface>
                  </CardShell>
                </ScaleToFitFrame>
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
          />
        )}
      </div>
    </div>
  );
}

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}
