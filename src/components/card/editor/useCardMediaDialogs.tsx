import {
  CARD_ACTION_BG_CLASS,
  CARD_ACTION_COLOR_IDLE_CLASS,
  CARD_ACTION_ICON_CLASS,
} from "@constants/shared/flashcard";
import { sanitizeReferences } from "@/components/card/editor/cardEditorUtils";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Link as LinkIcon } from "@/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CardFaceAttachmentAudio,
  CardFaceAttachments,
} from "@/types/domain/card";
import type { UploadedImage } from "@/types/domain/assets";
import type { ReferenceBlockData } from "@/types/domain/base";

type Side = "question" | "answer";
type UseCardMediaDialogsParams = {
  getSideAttachments: (side: Side) => CardFaceAttachments;
  setSideAttachments: (
    side: Side,
    nextAttachments: CardFaceAttachments,
  ) => void;
};

const normalizeAttachments = (
  attachments: CardFaceAttachments | null | undefined,
): CardFaceAttachments => ({
  images: attachments?.images ?? [],
  audios: attachments?.audios ?? [],
  references: attachments?.references ?? [],
});

export const useCardMediaDialogs = ({
  getSideAttachments,
  setSideAttachments,
}: UseCardMediaDialogsParams) => {
  const [imageDialogSide, setImageDialogSide] = useState<Side | null>(null);
  const [audioDialogSide, setAudioDialogSide] = useState<Side | null>(null);
  const [linkDialogSide, setLinkDialogSide] = useState<Side | null>(null);

  const getSideAttachmentsRef = useRef(getSideAttachments);
  const setSideAttachmentsRef = useRef(setSideAttachments);

  useEffect(() => {
    getSideAttachmentsRef.current = getSideAttachments;
  }, [getSideAttachments]);

  useEffect(() => {
    setSideAttachmentsRef.current = setSideAttachments;
  }, [setSideAttachments]);

  const getDialogImages = useCallback((side: Side): UploadedImage[] => {
    return (
      normalizeAttachments(getSideAttachmentsRef.current(side)).images ?? []
    );
  }, []);

  const setDialogImages = useCallback((side: Side, images: UploadedImage[]) => {
    const current = normalizeAttachments(getSideAttachmentsRef.current(side));
    setSideAttachmentsRef.current(side, {
      ...current,
      images,
    });
  }, []);

  const getDialogAudios = useCallback((side: Side) => {
    return (
      normalizeAttachments(getSideAttachmentsRef.current(side)).audios ?? []
    );
  }, []);

  const setDialogAudios = useCallback((side: Side, items: unknown[]) => {
    const current = normalizeAttachments(getSideAttachmentsRef.current(side));
    setSideAttachmentsRef.current(side, {
      ...current,
      audios: items as CardFaceAttachmentAudio[],
    });
  }, []);

  const getReferenceItems = useCallback((side: Side): ReferenceBlockData[] => {
    return (
      normalizeAttachments(getSideAttachmentsRef.current(side)).references ?? []
    );
  }, []);

  const setReferenceItems = useCallback(
    (side: Side, refs: ReferenceBlockData[]) => {
      const current = normalizeAttachments(getSideAttachmentsRef.current(side));
      setSideAttachmentsRef.current(side, {
        ...current,
        references: refs ?? [],
      });
    },
    [],
  );

  const getImageCount = useCallback(
    (side: Side) => getDialogImages(side).length,
    [getDialogImages],
  );

  const getAudioCount = useCallback(
    (side: Side) => getDialogAudios(side).length,
    [getDialogAudios],
  );

  const getLinkCount = useCallback(
    (side: Side) => sanitizeReferences(getReferenceItems(side) ?? []).length,
    [getReferenceItems],
  );

  const renderMediaDialogButtons = useCallback(
    (side: Side) => {
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
    },
    [
      getAudioCount,
      getImageCount,
      getLinkCount,
      getReferenceItems,
      setReferenceItems,
    ],
  );

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
};
