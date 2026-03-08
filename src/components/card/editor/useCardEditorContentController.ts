import { useCardBlocksDnd } from "@/components/card/editor/useCardBlocksDnd";
import { useCardMediaDialogs } from "@/components/card/editor/useCardMediaDialogs";

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CardBlock, UploadedImage } from "@/types";

type DraftShape = {
  questionImages: UploadedImage[];
  answerImages: UploadedImage[];
  questionBlocks: CardBlock[];
  answerBlocks: CardBlock[];
};

type UseCardEditorContentControllerParams<TDraft extends DraftShape | null> = {
  draft: TDraft;
  setDraft: Dispatch<SetStateAction<TDraft>>;
  allowAutoMinHeightSyncRef: MutableRefObject<boolean>;
  resetDialogsRef: MutableRefObject<() => void>;
};

export function useCardEditorContentController<
  TDraft extends DraftShape | null,
>({
  draft,
  setDraft,
  allowAutoMinHeightSyncRef,
  resetDialogsRef,
}: UseCardEditorContentControllerParams<TDraft>) {
  const getSideBlocks = (side: "question" | "answer") =>
    side === "question"
      ? (draft?.questionBlocks ?? [])
      : (draft?.answerBlocks ?? []);

  const setSideBlocks = (
    side: "question" | "answer",
    nextBlocks: CardBlock[],
  ) => {
    allowAutoMinHeightSyncRef.current = true;
    setDraft((prev) => {
      if (!prev) return prev;
      const reindexed = nextBlocks.map((block, index) => ({
        ...block,
        orderIndex: index,
      }));
      return side === "question"
        ? { ...prev, questionBlocks: reindexed }
        : { ...prev, answerBlocks: reindexed };
    });
  };

  const upsertSingleBlock = (
    side: "question" | "answer",
    type: CardBlock["type"],
    payload: Partial<CardBlock>,
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

  const removeBlockByTypeIfExists = (
    side: "question" | "answer",
    type: CardBlock["type"],
  ) => {
    const blocks = getSideBlocks(side);
    setSideBlocks(
      side,
      blocks.filter((block) => block.type !== type),
    );
  };

  const { onDragEnd } = useCardBlocksDnd({
    draft,
    setDraft,
    allowAutoMinHeightSyncRef,
  });

  const mediaDialogs = useCardMediaDialogs({
    draft,
    setDraft,
    getSideBlocks,
    setSideBlocks,
    removeBlockByTypeIfExists,
    upsertSingleBlock,
  });

  useEffect(() => {
    resetDialogsRef.current = () => {
      mediaDialogs.setImageDialogSide(null);
      mediaDialogs.setAudioDialogSide(null);
      mediaDialogs.setLinkDialogSide(null);
    };
  }, [mediaDialogs, resetDialogsRef]);

  return {
    onDragEnd,
    setSideBlocks,
    ...mediaDialogs,
  };
}



