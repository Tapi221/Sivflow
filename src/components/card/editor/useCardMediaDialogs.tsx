import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@web-renderer/lib/utils";
import type { ComponentType, SVGProps } from "react";
import * as stratisIcons from "stratis-ui-icons";
import { sanitizeReferences } from "./cardEditorUtils";
import { CARD_ACTION_BG_CLASS, CARD_ACTION_COLOR_IDLE_CLASS, CARD_ACTION_ICON_CLASS } from "@/components/card/frame/cardAction.constants";
import type { UploadedImage } from "@/types/domain/assets";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardFaceAttachmentAudio, CardFaceAttachments } from "@/types/domain/card";



type Side = "question" | "answer";
type UseCardMediaDialogsParams = {
  getSideAttachments: (side: Side) => CardFaceAttachments;
  setSideAttachments: (side: Side, nextAttachments: CardFaceAttachments) => void;
};
type StratisIconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type StratisComponentIconProps = {
  icon: StratisIconComponent;
  className?: string;
};



const STRATIS_ICON_COMPONENTS = stratisIcons as unknown as Record<string, StratisIconComponent | undefined>;
const STRATIS_AUDIO_ICON_NAMES = ["StratisAudioSettings01Icon"] as const;
const STRATIS_IMAGE_ICON_NAMES = ["StratisImage01Icon", "StratisImageIcon"] as const;
const STRATIS_LINK_ICON_NAMES = ["StratisLinkAngledIcon"] as const;



const resolveStratisIcon = (names: readonly string[]): StratisIconComponent | null => names.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;



const StratisAudioIcon = resolveStratisIcon(STRATIS_AUDIO_ICON_NAMES);
const StratisImageIcon = resolveStratisIcon(STRATIS_IMAGE_ICON_NAMES);
const StratisLinkIcon = resolveStratisIcon(STRATIS_LINK_ICON_NAMES);



const normalizeAttachments = (attachments: CardFaceAttachments | null | undefined): CardFaceAttachments => ({
  images: attachments?.images ?? [],
  audios: attachments?.audios ?? [],
  references: attachments?.references ?? [],
});



const StratisComponentIcon = ({ icon: Icon, className }: StratisComponentIconProps) => <Icon aria-hidden="true" focusable="false" className={className} />;



const useCardMediaDialogs = ({ getSideAttachments, setSideAttachments }: UseCardMediaDialogsParams) => {
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
      const base = cn("inline-flex shrink-0 items-center justify-center gap-0.5 rounded-full h-7 min-h-0 min-w-0 px-1.5 text-xs font-semibold leading-none whitespace-nowrap", CARD_ACTION_BG_CLASS, CARD_ACTION_COLOR_IDLE_CLASS);
      const iconClassName = cn(CARD_ACTION_ICON_CLASS, "h-4 w-4 shrink-0");

      const openLinkDialog = () => {
        if (getReferenceItems(side).length === 0) {
          setReferenceItems(side, [{ url: "", name: "" }]);
        }
        setLinkDialogSide(side);
      };

      return (
        <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={base} onClick={() => setImageDialogSide(side)} aria-label="画像を追加">
            {StratisImageIcon !== null && <StratisComponentIcon icon={StratisImageIcon} className={iconClassName} />}
            {imageCount > 0 && <span>x{imageCount}</span>}
          </button>
          <button type="button" className={base} onClick={() => setAudioDialogSide(side)} aria-label="音声を追加">
            {StratisAudioIcon !== null && <StratisComponentIcon icon={StratisAudioIcon} className={iconClassName} />}
            {audioCount > 0 && <span>x{audioCount}</span>}
          </button>
          <button type="button" className={base} onClick={openLinkDialog} aria-label="リンクを追加">
            {StratisLinkIcon !== null && <StratisComponentIcon icon={StratisLinkIcon} className={iconClassName} />}
            {linkCount > 0 && <span>x{linkCount}</span>}
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



export { useCardMediaDialogs };
