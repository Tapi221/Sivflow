import {
  normalizeCrossSideId,
  normalizeOrderIndex,
} from "@/components/card/editor/cardEditorUtils";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CardBlock } from "@/types";

type DndLocation = { droppableId: string; index: number };
export type DndResult = {
  source: DndLocation;
  destination?: DndLocation | null;
};

type DraftShape = {
  questionBlocks: CardBlock[];
  answerBlocks: CardBlock[];
};

type UseCardBlocksDndParams<TDraft extends DraftShape | null> = {
  draft: TDraft;
  setDraft: Dispatch<SetStateAction<TDraft>>;
  allowAutoMinHeightSyncRef: MutableRefObject<boolean>;
};

export function useCardBlocksDnd<TDraft extends DraftShape | null>({
  draft,
  setDraft,
  allowAutoMinHeightSyncRef,
}: UseCardBlocksDndParams<TDraft>) {
  const onDragEnd = (result: DndResult) => {
    if (!draft) return;
    if (!result.destination) return;
    allowAutoMinHeightSyncRef.current = true;

    const { source, destination } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const listFor = (id: string) => {
      if (id === "question-blocks") return [...draft.questionBlocks];
      return [...draft.answerBlocks];
    };

    if (source.droppableId === destination.droppableId) {
      const list = listFor(source.droppableId);
      const [moved] = list.splice(source.index, 1);
      list.splice(destination.index, 0, moved);

      const re = normalizeOrderIndex(list as CardBlock[]);
      setDraft((prev) => {
        if (!prev) return prev;
        return source.droppableId === "question-blocks"
          ? { ...prev, questionBlocks: re }
          : { ...prev, answerBlocks: re };
      });
      return;
    }

    const sourceList = listFor(source.droppableId);
    const destList = listFor(destination.droppableId);

    const [rawMoved] = sourceList.splice(source.index, 1);
    const nextSide: "question" | "answer" =
      destination.droppableId === "question-blocks" ? "question" : "answer";
    const movedBlock = rawMoved as CardBlock & { id?: unknown };
    const maybeNewId = normalizeCrossSideId(movedBlock?.id, nextSide);
    const moved = maybeNewId ? { ...movedBlock, id: maybeNewId } : rawMoved;

    destList.splice(destination.index, 0, moved);

    const reS = normalizeOrderIndex(sourceList as CardBlock[]);
    const reD = normalizeOrderIndex(destList as CardBlock[]);

    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };

      if (source.droppableId === "question-blocks") next.questionBlocks = reS;
      else next.answerBlocks = reS;

      if (destination.droppableId === "question-blocks")
        next.questionBlocks = reD;
      else next.answerBlocks = reD;

      return next;
    });
  };

  return { onDragEnd };
}




