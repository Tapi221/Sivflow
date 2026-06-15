import { memo } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/chip/panel/dialog.desktop/dialog/dialog";
import { LinkEditor } from "@/components/card/editor/LinkEditor";
import MediaUploader from "@/components/card/media/MediaUploader";
import type { UploadedImage } from "@/types";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardFaceAttachmentAudio } from "@/types/domain/card";

type Side = "question" | "answer";
type DialogAudioItem = string | CardFaceAttachmentAudio;
interface MediaDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: ReactNode;
}
interface CardEditorPaneMediaDialogsProps {
  imageDialogSide: Side | null;
  setImageDialogSide: (side: Side | null) => void;
  audioDialogSide: Side | null;
  setAudioDialogSide: (side: Side | null) => void;
  linkDialogSide: Side | null;
  setLinkDialogSide: (side: Side | null) => void;
  getDialogImages: (side: Side) => UploadedImage[];
  setDialogImages: (side: Side, next: UploadedImage[]) => void;
  getDialogAudios: (side: Side) => DialogAudioItem[];
  setDialogAudios: (side: Side, next: DialogAudioItem[]) => void;
  getReferenceItems: (side: Side) => ReferenceBlockData[];
  setReferenceItems: (side: Side, next: ReferenceBlockData[]) => void;
}

const toAudioUrl = (item: DialogAudioItem): string => typeof item === "string" ? item : item.url;
const toDialogAudio = (url: string, index: number): CardFaceAttachmentAudio => ({
  url,
  filename: `audio-${index + 1}`,
  order: index,
});
const areMediaDialogsPropsEqual = (prev: CardEditorPaneMediaDialogsProps, next: CardEditorPaneMediaDialogsProps): boolean => {
  const prevClosed = prev.imageDialogSide === null && prev.audioDialogSide === null && prev.linkDialogSide === null;
  const nextClosed = next.imageDialogSide === null && next.audioDialogSide === null && next.linkDialogSide === null;
  if (prevClosed && nextClosed) return true;
  return false;
};

const MediaDialog = ({ title, open, onClose, maxWidth = "max-w-2xl", children }: MediaDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};
const CardEditorPaneMediaDialogsInner = ({ imageDialogSide, setImageDialogSide, audioDialogSide, setAudioDialogSide, linkDialogSide, setLinkDialogSide, getDialogImages, setDialogImages, getDialogAudios, setDialogAudios, getReferenceItems, setReferenceItems }: CardEditorPaneMediaDialogsProps) => {
  return (
    <>
      <MediaDialog title="画像を追加" open={Boolean(imageDialogSide)} onClose={() => setImageDialogSide(null)} maxWidth="max-w-3xl">
        {imageDialogSide ? (
          <MediaUploader type="image" urls={getDialogImages(imageDialogSide)} onChange={(next) => setDialogImages(imageDialogSide, next)} maxFiles={10} />
        ) : null}
      </MediaDialog>
      <MediaDialog title="音声を追加" open={Boolean(audioDialogSide)} onClose={() => setAudioDialogSide(null)}>
        {audioDialogSide ? (
          <MediaUploader type="audio" urls={getDialogAudios(audioDialogSide).map(toAudioUrl)} onChange={(next) => setDialogAudios(audioDialogSide, next.map(toDialogAudio))} maxFiles={10} />
        ) : null}
      </MediaDialog>
      <MediaDialog title="リンクを追加" open={Boolean(linkDialogSide)} onClose={() => setLinkDialogSide(null)}>
        {linkDialogSide ? (
          <LinkEditor items={getReferenceItems(linkDialogSide)} onChange={(next) => setReferenceItems(linkDialogSide, next)} />
        ) : null}
      </MediaDialog>
    </>
  );
};

const CardEditorPaneMediaDialogs = memo(CardEditorPaneMediaDialogsInner, areMediaDialogsPropsEqual);
CardEditorPaneMediaDialogs.displayName = "CardEditorPaneMediaDialogs";
export { CardEditorPaneMediaDialogs };
export type { CardEditorPaneMediaDialogsProps };
