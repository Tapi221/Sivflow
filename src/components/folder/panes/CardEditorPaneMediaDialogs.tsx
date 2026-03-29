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

interface CardEditorPaneMediaDialogsProps {
  imageDialogSide: "question" | "answer" | null;
  setImageDialogSide: (side: "question" | "answer" | null) => void;
  audioDialogSide: "question" | "answer" | null;
  setAudioDialogSide: (side: "question" | "answer" | null) => void;
  linkDialogSide: "question" | "answer" | null;
  setLinkDialogSide: (side: "question" | "answer" | null) => void;
  getDialogImages: (side: "question" | "answer") => UploadedImage[];
  setDialogImages: (side: "question" | "answer", next: UploadedImage[]) => void;
  getDialogAudios: (side: "question" | "answer") => unknown[];
  setDialogAudios: (side: "question" | "answer", next: unknown[]) => void;
  getReferenceItems: (side: "question" | "answer") => unknown[];
  setReferenceItems: (side: "question" | "answer", next: unknown[]) => void;
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
      <Dialog
        modal={false}
        open={Boolean(imageDialogSide)}
        onOpenChange={(open) => !open && setImageDialogSide(null)}
      >
        <DialogContent nonModal className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>画像を追加</DialogTitle>
          </DialogHeader>
          {imageDialogSide && (
            <MediaUploader
              type="image"
              urls={getDialogImages(imageDialogSide)}
              onChange={(next) =>
                setDialogImages(imageDialogSide, next as UploadedImage[])
              }
              maxFiles={10}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(audioDialogSide)}
        onOpenChange={(open) => !open && setAudioDialogSide(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>音声を追加</DialogTitle>
          </DialogHeader>
          {audioDialogSide && (
            <MediaUploader
              type="audio"
              urls={getDialogAudios(audioDialogSide)}
              onChange={(next) =>
                setDialogAudios(audioDialogSide, next as unknown[])
              }
              maxFiles={10}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(linkDialogSide)}
        onOpenChange={(open) => !open && setLinkDialogSide(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>リンクを追加</DialogTitle>
          </DialogHeader>
          {linkDialogSide && (
            <LinkEditor
              items={getReferenceItems(linkDialogSide)}
              onChange={(next) => setReferenceItems(linkDialogSide, next)}
            />
          )}
        </DialogContent>
      </Dialog>
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
