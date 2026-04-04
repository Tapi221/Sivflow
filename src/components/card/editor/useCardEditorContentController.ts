import { useCardMediaDialogs } from "@/components/card/editor/useCardMediaDialogs";

import type { CardBlock, CardFaceAttachments } from "@/types/domain/card";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useEffect, useMemo } from "react";
type DraftShape = {
  frontBlocks: CardBlock[];
  backBlocks: CardBlock[];
  frontAttachments: CardFaceAttachments;
  backAttachments: CardFaceAttachments;
};

type UseCardEditorContentControllerParams<TDraft extends DraftShape | null> = {
  draft: TDraft;
  setDraft: Dispatch<SetStateAction<TDraft>>;
  allowAutoMinHeightSyncRef: MutableRefObject<boolean>;
  resetDialogsRef: MutableRefObject<() => void>;
};

export const useCardEditorContentController = <
  TDraft extends DraftShape | null,
>({
  draft,
  setDraft,
  allowAutoMinHeightSyncRef,
  resetDialogsRef,
}: UseCardEditorContentControllerParams<TDraft>) => {
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
        ? (draft?.frontBlocks ?? [])
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
          side === "question" ? prev.frontBlocks : prev.backBlocks;
        if (currentBlocks === reindexed) return prev;
        return side === "question"
          ? { ...prev, frontBlocks: reindexed }
          : { ...prev, backBlocks: reindexed };
      });
    },
    [allowAutoMinHeightSyncRef, reindexBlocks, setDraft],
  );

  const getSideAttachments = useCallback(
    (side: "question" | "answer") =>
      side === "question"
        ? (draft?.frontAttachments ?? {})
        : (draft?.backAttachments ?? {}),
    [draft?.backAttachments, draft?.frontAttachments],
  );

  const setSideAttachments = useCallback(
    (
      side: "question" | "answer",
      nextAttachments: CardFaceAttachments,
    ) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return side === "question"
          ? { ...prev, frontAttachments: nextAttachments }
          : { ...prev, backAttachments: nextAttachments };
      });
    },
    [setDraft],
  );

  const mediaDialogs = useCardMediaDialogs({
    getSideAttachments,
    setSideAttachments,
  });
  const { setImageDialogSide, setAudioDialogSide, setLinkDialogSide } =
    mediaDialogs;

  useEffect(() => {
    resetDialogsRef.current = () => {
      setImageDialogSide(null);
      setAudioDialogSide(null);
      setLinkDialogSide(null);
    };
  }, [
    resetDialogsRef,
    setAudioDialogSide,
    setImageDialogSide,
    setLinkDialogSide,
  ]);

  return useMemo(
    () => ({
      setSideBlocks,
      ...mediaDialogs,
    }),
    [mediaDialogs, setSideBlocks],
  );
};
