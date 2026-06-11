import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { suIconAudioSettings01, suIconImage, suIconLinkAngled, type StratisUiIcon } from "stratis-ui-icons";
import { CARD_ACTION_BG_CLASS, CARD_ACTION_COLOR_IDLE_CLASS, CARD_ACTION_ICON_CLASS } from "@/components/card/frame/cardAction.constants";
import { cn } from "@/lib/utils";
import type { UploadedImage } from "@/types/domain/assets";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardFaceAttachmentAudio, CardFaceAttachments } from "@/types/domain/card";
import { sanitizeReferences } from "./cardEditorUtils";

type Side = "question" | "answer";

type UseCardMediaDialogsParams = {
  getSideAttachments: (side: Side) => CardFaceAttachments;
  setSideAttachments: (side: Side, nextAttachments: CardFaceAttachments) => void;
};

type StratisDataIconProps = {
  icon: StratisUiIcon;
  className?: string;
};

const normalizeStratisIconData = (source: string): string => source.replace(/<svg\b/, "<svg aria-hidden=\"true\" focusable=\"false\"").replace(/\s(width|height)=\"[^\"]*\"/g, "").replace(/\sstroke=\"(?!none|currentColor)[^\"]*\"/g, " stroke=\"currentColor\"").replace(/\sfill=\"(?!none|currentColor|url\()[^\"]*\"/g, " fill=\"currentColor\"");

const StratisDataIcon = ({ icon, className }: StratisDataIconProps) => <span aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: normalizeStratisIconData(icon.data) }} />;

const normalizeAttachments = (attachments: CardFaceAttachments | null | undefined): CardFaceAttachments => ({
  images: attachments?.images ?? [],
  audios: attachments?.audios ?? [],
  references: attachments?.references ?? [],
});

export const useCardMediaDialogs = ({ getSideAttachments, setSideAttachments }: UseCardMediaDialogsParams) => {
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

  const getDialogImages = useCallback((side: Side): UploadedImage[] => normalizeAttachments(getSideAttachmentsRef.current(side)).images ?? [], []);

  const setDialogImages = useCallback((side: Side, images: UploadedImage[]) => {
    const current = normalizeAttachments(getSideAttachmentsRef.current(side));
    setSideAttachmentsRef.current(side, {
      ...current,
      images,
    });
  }, []);

  const getDialogAudios = useCallback((side: Side) => normalizeAttachments(getSideAttachmentsRef.current(side)).audios ?? [], []);

  const setDialogAudios = useCallback((side: Side, items: unknown[]) => {
    const current = normalizeAttachments(getSideAttachmentsRef.current(side));
    setSideAttachmentsRef.current(side, {
      ...current,
      audios: items as CardFaceAttachmentAudio[],
    });
  }, []);

  const getReferenceItems = useCallback((side: Side): ReferenceBlockData[] => normalizeAttachments(getSideAttachmentsRef.current(side)).references ?? [], []);

  const setReferenceItems = useCallback((side: Side, refs: ReferenceBlockData[]) => {
    const current = normalizeAttachments(getSideAttachmentsRef.current(side));
    setSideAttachmentsRef.current(side, {
      ...current,
      references: refs ?? [],
    });
  }, []);

  const getImageCount = useCallback((side: Side) => getDialogImages(side).length, [getDialogImages]);

  const getAudioCount = useCallback((side: Side) => getDialogAudios(side).length, [getDialogAudios]);

  const getLinkCount = useCallback((side: Side) => sanitizeReferences(getReferenceItems(side) ?? []).length, [getReferenceItems]);

  const renderMediaDialogButtons = useCallback(
    (side: Side) => {
      const imageCount = getImageCount(side);
      const audioCount = getAudioCount(side);
      const linkCount = getLinkCount(side);
      const base = cn("inline-flex shrink-0 items-center justify-center gap-0.5 rounded-full h-7 min-h-0 min-w-0 px-1.5 text-[10px] font-semibold leading-none whitespace-nowrap", CARD_ACTION_BG_CLASS, CARD_ACTION_COLOR_IDLE_CLASS);

      const openLinkDialog = () => {
        if (getReferenceItems(side).length === 0) {
          setReferenceItems(side, [{ url: "", name: "" }]);
        }
        setLinkDialogSide(side);
      };

      return (
        <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={base} onClick={() => setImageDialogSide(side)} aria-label="画像を追加">
            <StratisDataIcon icon={suIconImage} className={cn(CARD_ACTION_ICON_CLASS, "shrink-0 [&>svg]:h-4 [&>svg]:w-4")} />
            {imageCount > 0 ? <span>x{imageCount}</span> : null}
          </button>

          <button type="button" className={base} onClick={() => setAudioDialogSide(side)} aria-label="音声を追加">
            <StratisDataIcon icon={suIconAudioSettings01} className={cn(CARD_ACTION_ICON_CLASS, "shrink-0 [&>svg]:h-4 [&>svg]:w-4")} />
            {audioCount > 0 ? <span>x{audioCount}</span> : null}
          </button>

          <button type="button" className={base} onClick={openLinkDialog} aria-label="リンクを追加">
            <StratisDataIcon icon={suIconLinkAngled} className={cn(CARD_ACTION_ICON_CLASS, "shrink-0 [&>svg]:h-4 [&>svg]:w-4")} />
            {linkCount > 0 ? <span>x{linkCount}</span> : null}
          </button>
        </div>
      );
    },
    [getAudioCount, getImageCount, getLinkCount, getReferenceItems, setReferenceItems],
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
    [audioDialogSide, getDialogAudios, getDialogImages, getReferenceItems, imageDialogSide, linkDialogSide, renderMediaDialogButtons, setDialogAudios, setDialogImages, setReferenceItems],
  );
};
