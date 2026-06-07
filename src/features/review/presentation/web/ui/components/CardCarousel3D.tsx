import type { ReactNode } from "react";
import { VerticalCardPager } from "@/features/review/VerticalCardPager";

export type CardCarousel3DProps<T> = {
  cards: T[];
  syncIndex?: number;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  renderCenter: (card: T, index: number, isActive: boolean) => ReactNode;
  renderPreview?: (card: T, index: number, isActive: boolean