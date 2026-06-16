import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";



type CardCarousel3DProps<T> = {
  cards: T[];
  syncIndex?: number;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  renderCenter: (card: T, index: number, isActive: boolean) => ReactNode;
  renderPreview?: (card: T, index: number, isActive: boolean) => ReactNode;
  getKey?: (card: T, index: number) => string | number;
  onFlip?: () => void;
};



const clampIndex = (index: number, count: number) => {
  if (count <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), count - 1);
};



const CardCarousel3D = <T,>({ cards, syncIndex, initialIndex = 0, onIndexChange, renderCenter, renderPreview, getKey, onFlip }: CardCarousel3DProps<T>) => {
  void renderPreview;

  const initialActiveIndex = useMemo(() => clampIndex(syncIndex ?? initialIndex, cards.length), [cards.length, initialIndex, syncIndex]);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  useEffect(() => {
    setActiveIndex(clampIndex(syncIndex ?? initialIndex, cards.length));
  }, [cards.length, initialIndex, syncIndex]);

  return (
    <VerticalCardPager
      cards={cards}
      activeIndex={activeIndex}
      onActiveIndexChange={(index) => {
        setActiveIndex(index);
        onIndexChange?.(index);
      }}
      onFlip={onFlip}
      getKey={getKey}
      renderCard={(card, index, isActive) => renderCenter(card, index, isActive)}
    />
  );
};



export { CardCarousel3D };


export type { CardCarousel3DProps };
