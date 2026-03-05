import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Flashcard } from "./Flashcard";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  CANONICAL_CARD_WIDTH,
  CARD_SAFE_PADDING_PX,
} from "../common/constants";
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

function isTypingTarget(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;

  // shadcn/ui みたいに div に role="textbox" を付けるケースも吸う
  const role = target.getAttribute("role");
  if (role === "textbox" || role === "combobox") return true;

  return false;
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
      setIsFlipped(false);
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
        when: (e: KeyboardEvent) => !isTypingTarget(e.target),
      },
      {
        key: "ArrowRight",
        action: handleNext,
        description: "次のカードへ移動",
        when: (e: KeyboardEvent) => !isTypingTarget(e.target),
      },
      {
        // できれば event.code === 'Space' で判定したいけど、フック次第なので key で置く
        key: " ",
        action: (e?: KeyboardEvent) => {
          // Space のデフォスクロール殺す
          if (e) e.preventDefault();
          handleFlip();
        },
        description: "裏表を切り替え",
        when: (e: KeyboardEvent) => !isTypingTarget(e.target),
      },
    ],
    [handlePrev, handleNext, handleFlip],
  );

  useKeyboardShortcuts(shortcuts as any);

  const card = cards[currentIndex];

  if (!card) {
    return (
      <div className="text-center py-12 text-gray-500">カードがありません</div>
    );
  }

  return (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: `${CANONICAL_CARD_WIDTH + 40}px` }}
    >
      <MobileScalableCard
        cardDesignWidth={CANONICAL_CARD_WIDTH}
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
