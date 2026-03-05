import React, { useState } from "react";
import { Flashcard } from "../frame/Flashcard";
import { Button } from "../../ui/button";
import { X } from "@/ui/icons";
import { useUserSettings } from "@/hooks/useUserSettings";
import { MobileScalableCard } from "../frame/MobileScalableCard";
import {
  CANONICAL_CARD_WIDTH,
  CARD_SAFE_PADDING_PX,
} from "../common/constants";

interface CardPopupProps {
  card: unknown;
  onClose: () => void;
  onEdit?: (card: unknown) => void;
  onToggleUncertainty?: (card: unknown) => void;
  onToggleBookmark?: (card: unknown) => void;
}

export function CardPopup({
  card,
  onClose,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: CardPopupProps) {
  const { settings } = useUserSettings();
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 md:-top-12 md:-right-4 text-slate-800 md:text-white bg-white/50 md:bg-transparent hover:bg-white/80 md:hover:bg-white/20 rounded-full z-50"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
        <MobileScalableCard
          cardDesignWidth={CANONICAL_CARD_WIDTH}
          safePadding={CARD_SAFE_PADDING_PX}
        >
          <Flashcard
            card={card}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
            onEdit={(c) => {
              // 編集へ行くなら、閲覧モーダルは邪魔なので閉じる
              onEdit?.(c);
              onClose();
            }}
            onToggleUncertainty={onToggleUncertainty}
            onToggleBookmark={onToggleBookmark}
            editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
          />
        </MobileScalableCard>
      </div>
    </div>
  );
}
