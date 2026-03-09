import {
    CANONICAL_CARD_WIDTH,
    CARD_BASE_WIDTH,
    CARD_DISPLAY_SCALE,
    CARD_SAFE_PADDING_PX,
} from "@/components/card/common/constants";

const CARD_DISPLAY_WIDTH = Math.round(CARD_BASE_WIDTH * CARD_DISPLAY_SCALE);
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { useKeyboardShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flashcard } from "./Flashcard";
import { MobileScalableCard } from "./MobileScalableCard";

// アプリに合わせてちゃんとした型に置き換えてね（最低限の例）
export type Card = {
  id: string;
  // 必要なフィールドを追加
  [key: string]: unknown;
};

type CardViewerProps = {
  cards: Card[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onEdit: (card: Card) => void;
  onToggleUncertainty: (card: Card) => void;
  onToggleBookmark: (card: Card) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function CardViewer({
  cards,
  currentIndex,
  onIndexChange,
  onEdit,
  onToggleUncertainty,
  onToggleBookmark,
}: CardViewerProps) {
  const { settings } = useUserSettings();
  const [isFlipped, setIsFlipped] = useState(false);

  // cards が減ったり差し替わったりして index が範囲外になったときの安全装置
  useEffect(() => {
    if (cards.length === 0) return;
    const next = clamp(currentIndex, 0, cards.length - 1);
    if (next !== currentIndex) {
      onIndexChange(next);
      // 表示カードが変わるので flip もリセット
      queueMicrotask(() => setIsFlipped(false));
    }
  }, [cards.length, currentIndex, onIndexChange]);

  const handleIndexChange = useCallback(
    (newIndex: number) => {
      setIsFlipped(false);
      onIndexChange(newIndex);
    },
    [onIndexChange],
  );

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) handleIndexChange(currentIndex - 1);
  }, [currentIndex, handleIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) handleIndexChange(currentIndex + 1);
  }, [currentIndex, cards.length, handleIndexChange]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // useKeyboardShortcuts が「Eventを渡してくれる」設計じゃない場合があるので
  // ここでは「無効条件」もショートカット定義に持たせる想定（後述のフック修正で対応）
  const shortcuts = useMemo(
    () => [
      {
        key: "ArrowLeft",
        action: handlePrev,
        description: "前のカードへ移動",
      },
      {
        key: "ArrowRight",
        action: handleNext,
        description: "次のカードへ移動",
      },
      {
        // できれば event.code === 'Space' で判定したいけど、フック次第なので key で置く
        key: " ",
        action: handleFlip,
        description: "裏表を切り替え",
      },
    ],
    [handlePrev, handleNext, handleFlip],
  );

  useKeyboardShortcuts(shortcuts);

  const card = cards[currentIndex];

  if (!card) {
    return (
      <div className="text-center py-12 text-gray-500">カードがありません</div>
    );
  }

  return (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: `${CARD_DISPLAY_WIDTH + 40}px` }}
    >
      <MobileScalableCard
        cardDesignWidth={CARD_DISPLAY_WIDTH}
        safePadding={CARD_SAFE_PADDING_PX}
      >
        <Flashcard
          card={card}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onEdit={onEdit}
          onToggleUncertainty={onToggleUncertainty}
          onToggleBookmark={onToggleBookmark}
          onPrev={handlePrev}
          onNext={handleNext}
          hasNext={currentIndex < cards.length - 1}
          hasPrev={currentIndex > 0}
          currentIndex={currentIndex}
          totalCards={cards.length}
          editorSharedHeightPx={settings?.cardEditorHeightPx ?? null}
        />
      </MobileScalableCard>
    </div>
  );
}






