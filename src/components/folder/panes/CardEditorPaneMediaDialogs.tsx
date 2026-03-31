import React from "react";
import { LinkEditor } from "@/components/card/editor/LinkEditor";
import MediaUploader from "@/components/card/media/MediaUploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { memo } from "react";
import type { UploadedImage } from "@/types";

type Side = "question" | "answer";

interface MediaDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

function MediaDialog({ title, open, onClose, maxWidth = "max-w-2xl", children }: MediaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
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
  getDialogAudios: (side: Side) => unknown[];
  setDialogAudios: (side: Side, next: unknown[]) => void;
  getReferenceItems: (side: Side) => unknown[];
  setReferenceItems: (side: Side, next: unknown[]) => void;
}

function CardEditorPaneMediaDialogsInner({
  imageDialogSide,
  setImageDialogSide,
  audioDialogSide,
  setAudioDialogSide,
  linkDialogSide,
  setLinkDialogSide,
  getDialogImages,
  setDialogImages,
  getDialogAudios,
  setDialogAudios,
  getReferenceItems,
  setReferenceItems,
}: CardEditorPaneMediaDialogsProps) {
  return (
    <>
      <MediaDialog
        title="画像を追加"
        open={Boolean(imageDialogSide)}
        onClose={() => setImageDialogSide(null)}
        maxWidth="max-w-3xl"
      >
        {imageDialogSide && (
          <MediaUploader
            type="image"
            urls={getDialogImages(imageDialogSide)}
            onChange={(next) => setDialogImages(imageDialogSide, next as UploadedImage[])}
            maxFiles={10}
          />
        )}
      </MediaDialog>

      <MediaDialog
        title="音声を追加"
        open={Boolean(audioDialogSide)}
        onClose={() => setAudioDialogSide(null)}
      >
        {audioDialogSide && (
          <MediaUploader
            type="audio"
            urls={getDialogAudios(audioDialogSide)}
            onChange={(next) => setDialogAudios(audioDialogSide, next as unknown[])}
            maxFiles={10}
          />
        )}
      </MediaDialog>

      <MediaDialog
        title="リンクを追加"
        open={Boolean(linkDialogSide)}
        onClose={() => setLinkDialogSide(null)}
      >
        {linkDialogSide && (
          <LinkEditor
            items={getReferenceItems(linkDialogSide)}
            onChange={(next) => setReferenceItems(linkDialogSide, next)}
          />
        )}
      </MediaDialog>
    </>
  );
}

const areMediaDialogsPropsEqual = (
  prev: CardEditorPaneMediaDialogsProps,
  next: CardEditorPaneMediaDialogsProps,
): boolean => {
  const prevClosed =
    prev.imageDialogSide === null &&
    prev.audioDialogSide === null &&
    prev.linkDialogSide === null;
  const nextClosed =
    next.imageDialogSide === null &&
    next.audioDialogSide === null &&
    next.linkDialogSide === null;

  if (prevClosed && nextClosed) return true;
  return false;
};

export const CardEditorPaneMediaDialogs = memo(
  CardEditorPaneMediaDialogsInner,
  areMediaDialogsPropsEqual,
);
CardEditorPaneMediaDialogs.displayName = "CardEditorPaneMediaDialogs";
