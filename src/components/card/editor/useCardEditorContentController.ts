import { useCardMediaDialogs } from "@/components/card/editor/useCardMediaDialogs";

import type { CardBlock } from "@/types/domain/card";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useEffect, useMemo } from "react";
type DraftShape = {
  frontBlocks: CardBlock[];
  backBlocks: CardBlock[];
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
  const reindexBlocks = useCallback((blocks: CardBlock[]): CardBlock[] => {
    let changed = false;
    const reindexed = blocks.map((block, index) => {
      if (block.orderIndex === index) return block;
      changed = true;
      return {
        ...block,
        orderIndex: index,
      };
    });
    return changed ? reindexed : blocks;
  }, []);

  const getSideBlocks = useCallback(
    (side: "question" | "answer") =>
      side === "question"
        ? (draft?.frontBlocks?? [])
        : (draft?.backBlocks ?? []),
    [draft?.backBlocks, draft?.frontBlocks],
  );

  const setSideBlocks = useCallback(
    (side: "question" | "answer", nextBlocks: CardBlock[]) => {
      allowAutoMinHeightSyncRef.current = true;
      setDraft((prev) => {
        if (!prev) return prev;
        const reindexed = reindexBlocks(nextBlocks);
        const currentBlocks =
          side === "question" ? prev.frontBlocks: prev.backBlocks;
        if (currentBlocks === reindexed) return prev;
        return side === "question"
          ? { ...prev, frontBlocks: reindexed }
          : { ...prev, backBlocks: reindexed };
      });
    },
    [allowAutoMinHeightSyncRef, reindexBlocks, setDraft],
  );

  const upsertSingleBlock = useCallback((
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
  }, [getSideBlocks, setSideBlocks]);

  const removeBlockByTypeIfExists = useCallback((
    side: "question" | "answer",
    type: CardBlock["type"],
  ) => {
    const blocks = getSideBlocks(side);
    const filtered = blocks.filter((block) => block.type !== type);
    if (filtered.length === blocks.length) return;
    setSideBlocks(side, filtered);
  }, [getSideBlocks, setSideBlocks]);

  const mediaDialogs = useCardMediaDialogs({
    draft,
    setDraft,
    getSideBlocks,
    setSideBlocks,
    removeBlockByTypeIfExists,
    upsertSingleBlock,
  });
  const { setImageDialogSide, setAudioDialogSide, setLinkDialogSide } =
    mediaDialogs;

  useEffect(() => {
    resetDialogsRef.current = () => {
      setImageDialogSide(null);
      setAudioDialogSide(null);
      setLinkDialogSide(null);
    };
  }, [resetDialogsRef, setAudioDialogSide, setImageDialogSide, setLinkDialogSide]);

  return useMemo(
    () => ({
      setSideBlocks,
      ...mediaDialogs,
    }),
    [mediaDialogs, setSideBlocks],
  );
}









