import {
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
} from "@/components/card/common/constants";
import { sanitizeReferences } from "@/components/card/editor/cardEditorUtils";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Link as LinkIcon } from "@/ui/icons";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CardBlock, ReferenceBlockData, UploadedImage } from "@/types/domain/card";
type Side = "question" | "answer";
type DraftShape = object;

type UseCardMediaDialogsParams = {
  draft: DraftShape | null;
  setDraft: Dispatch<SetStateAction<DraftShape | null>>;
  getSideBlocks: (side: Side) => CardBlock[];
  setSideBlocks: (side: Side, nextBlocks: CardBlock[]) => void;
  removeBlockByTypeIfExists: (side: Side, type: CardBlock["type"]) => void;
  upsertSingleBlock: (
    side: Side,
    type: CardBlock["type"],
    payload: Partial<CardBlock>,
  ) => void;
};

export function useCardMediaDialogs({
  draft,
  setDraft,
  getSideBlocks,
  setSideBlocks,
  removeBlockByTypeIfExists,
  upsertSingleBlock,
}: UseCardMediaDialogsParams) {
  void setSideBlocks;
  const [imageDialogSide, setImageDialogSide] = useState<Side | null>(null);
  const [audioDialogSide, setAudioDialogSide] = useState<Side | null>(null);
  const [linkDialogSide, setLinkDialogSide] = useState<Side | null>(null);

  const draftRef = useRef(draft);
  const getSideBlocksRef = useRef(getSideBlocks);
  const removeBlockByTypeIfExistsRef = useRef(removeBlockByTypeIfExists);
  const upsertSingleBlockRef = useRef(upsertSingleBlock);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    getSideBlocksRef.current = getSideBlocks;
  }, [getSideBlocks]);

  useEffect(() => {
    removeBlockByTypeIfExistsRef.current = removeBlockByTypeIfExists;
  }, [removeBlockByTypeIfExists]);

  useEffect(() => {
    upsertSingleBlockRef.current = upsertSingleBlock;
  }, [upsertSingleBlock]);

  const getDialogImages = useCallback((side: Side): UploadedImage[] => {
    const imageBlock = getSideBlocksRef.current(side).find(
      (block) => block.type === "image",
    );
    return (imageBlock?.images ?? []) as UploadedImage[];
  }, []);

  const setDialogImages = useCallback(
    (side: Side, images: UploadedImage[]) => {
      if (!images || images.length === 0) {
        removeBlockByTypeIfExistsRef.current(side, "image");
        return;
      }
      upsertSingleBlockRef.current(side, "image", { images });
    },
    [],
  );

  const getDialogAudios = useCallback((side: Side) => {
    const block = getSideBlocksRef.current(side).find((b) => b.type === "audio");
    return (block?.audios ?? []) as unknown as (string | UploadedImage)[];
  }, []);

  const setDialogAudios = useCallback((side: Side, items: unknown[]) => {
    if (!items || items.length === 0) {
      removeBlockByTypeIfExistsRef.current(side, "audio");
      return;
    }
    upsertSingleBlockRef.current(side, "audio", { audios: items });
  }, []);

  const getReferenceItems = useCallback((side: Side): ReferenceBlockData[] => {
    const block = getSideBlocksRef.current(side).find(
      (candidate) => candidate.type === "reference",
    );
    return (block?.references ?? []) as ReferenceBlockData[];
  }, []);

  const setReferenceItems = useCallback(
    (side: Side, refs: ReferenceBlockData[]) => {
      const nextRefs = refs ?? [];
      if (nextRefs.length === 0) {
        removeBlockByTypeIfExistsRef.current(side, "reference");
        return;
      }
      upsertSingleBlockRef.current(side, "reference", { references: nextRefs });
    },
    [],
  );

  const getImageCount = useCallback(
    (side: Side) => getDialogImages(side).length,
    [getDialogImages],
  );

  const getAudioCount = useCallback(
    (side: Side) =>
      getSideBlocksRef
        .current(side)
        .filter((block) => block.type === "audio")
        .reduce((sum, block) => sum + (block.audios?.length ?? 0), 0),
    [],
  );

  const getLinkCount = useCallback(
    (side: Side) =>
      getSideBlocksRef
        .current(side)
        .filter((block) => block.type === "reference")
        .reduce(
          (sum, block) =>
            sum +
            (sanitizeReferences(
              ("references" in block ? block.references : []) ?? [],
            ).length ?? 0),
          0,
        ),
    [],
  );

  const renderMediaDialogButtons = useCallback((side: Side) => {
    const imageCount = getImageCount(side);
    const audioCount = getAudioCount(side);
    const linkCount = getLinkCount(side);
    const base = cn(
      "inline-flex shrink-0 items-center justify-center gap-0.5 rounded-full h-7 min-h-0 min-w-0 px-1.5 text-[10px] font-semibold leading-none whitespace-nowrap",
      CARD_ACTION_BG_CLASS,
      CARD_ACTION_COLOR_IDLE_CLASS,
    );

    const openLinkDialog = () => {
      if (getReferenceItems(side).length === 0) {
        setReferenceItems(side, [{ url: "", name: "" }]);
      }
      setLinkDialogSide(side);
    };

    return (
      <div
        className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={base}
          onClick={() => setImageDialogSide(side)}
          aria-label="画像を追加"
        >
          <ImageIcon className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          {imageCount > 0 ? <span>x{imageCount}</span> : null}
        </button>

        <button
          type="button"
          className={base}
          onClick={() => setAudioDialogSide(side)}
          aria-label="音声を追加"
        >
          <span
            aria-hidden="true"
            className="shrink-0 text-[13px] leading-none"
          >
            ♪
          </span>
          {audioCount > 0 ? <span>x{audioCount}</span> : null}
        </button>

        <button
          type="button"
          className={base}
          onClick={openLinkDialog}
          aria-label="リンクを追加"
        >
          <LinkIcon className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          {linkCount > 0 ? <span>x{linkCount}</span> : null}
        </button>
      </div>
    );
  }, [
    getAudioCount,
    getImageCount,
    getLinkCount,
    getReferenceItems,
    setReferenceItems,
  ]);

  return useMemo(
    () => ({
      imageDialogSide,
      setImageDialogSide,
      audioDialogSide,
      setAudioDialogSide,
      linkDialogSide,
      setLinkDialogSide,
      renderMediaDialogButtons,
      getDialogImages,
      setDialogImages,
      getDialogAudios,
      setDialogAudios,
      getReferenceItems,
      setReferenceItems,
    }),
    [
      audioDialogSide,
      getDialogAudios,
      getDialogImages,
      getReferenceItems,
      imageDialogSide,
      linkDialogSide,
      renderMediaDialogButtons,
      setDialogAudios,
      setDialogImages,
      setReferenceItems,
    ],
  );
}





