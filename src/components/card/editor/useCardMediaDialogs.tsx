import { Plus, Image as ImageIcon, Link as LinkIcon } from "@/ui/icons";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { sanitizeReferences } from "@/components/card/editor/cardEditorUtils";
import { CARD_ACTION_ICON_CLASS } from "@/components/card/common/constants";
import { cn } from "@/lib/utils";

import type { CardBlock, ReferenceBlockData, UploadedImage } from "@/types";

type Side = "question" | "answer";
type DraftShape = {
  questionImages: UploadedImage[];
  answerImages: UploadedImage[];
};

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

  const getDialogImages = (side: Side): UploadedImage[] =>
    (side === "question" ? draft?.questionImages : draft?.answerImages) ?? [];

  const setDialogImages = (side: Side, images: UploadedImage[]) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return side === "question"
        ? { ...prev, questionImages: images }
        : { ...prev, answerImages: images };
    });
  };

  const getDialogAudios = (side: Side) => {
    const block = getSideBlocks(side).find((b) => b.type === "audio");
    return (block?.audios ?? []) as unknown as (string | UploadedImage)[];
  };

  const setDialogAudios = (side: Side, items: unknown[]) => {
    if (!items || items.length === 0) {
      removeBlockByTypeIfExists(side, "audio");
      return;
    }
    upsertSingleBlock(side, "audio", { audios: items });
  };

  const getReferenceItems = (side: Side): ReferenceBlockData[] => {
    const block = getSideBlocks(side).find((b) => b.type === "reference");
    return (block?.references ?? []) as ReferenceBlockData[];
  };

  const setReferenceItems = (side: Side, refs: ReferenceBlockData[]) => {
    const nextRefs = refs ?? [];
    if (nextRefs.length === 0) {
      removeBlockByTypeIfExists(side, "reference");
      return;
    }
    upsertSingleBlock(side, "reference", { references: nextRefs });
  };

  const getImageCount = (side: Side) => getDialogImages(side).length;

  const getAudioCount = (side: Side) =>
    getSideBlocks(side)
      .filter((b) => b.type === "audio")
      .reduce((sum, b) => sum + (b.audios?.length ?? 0), 0);

  const getLinkCount = (side: Side) =>
    getSideBlocks(side)
      .filter((b) => b.type === "reference")
      .reduce(
        (sum, b) =>
          sum +
          (sanitizeReferences(("references" in b ? b.references : []) ?? [])
            .length ?? 0),
        0,
      );

  const renderMediaDialogButtons = (side: Side) => {
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
      <div
        className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={cn(base, "bg-slate-50 text-slate-500 hover:bg-slate-100")}
          onClick={() => setImageDialogSide(side)}
          aria-label="画像を追加"
        >
          <ImageIcon className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          <Plus className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          {imageCount > 0 ? <span>x{imageCount}</span> : null}
        </button>

        <button
          type="button"
          className={cn(base, "bg-slate-50 text-slate-500 hover:bg-slate-100")}
          onClick={() => setAudioDialogSide(side)}
          aria-label="音声を追加"
        >
          <span
            aria-hidden="true"
            className="shrink-0 text-[13px] leading-none"
          >
            ♪
          </span>
          <Plus className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          {audioCount > 0 ? <span>x{audioCount}</span> : null}
        </button>

        <button
          type="button"
          className={cn(base, "bg-slate-50 text-slate-500 hover:bg-slate-100")}
          onClick={openLinkDialog}
          aria-label="リンクを追加"
        >
          <LinkIcon className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          {linkCount > 0 ? (
            <span>x{linkCount}</span>
          ) : (
            <Plus className={cn(CARD_ACTION_ICON_CLASS, "shrink-0")} />
          )}
        </button>
      </div>
    );
  };

  return {
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
  };
}




