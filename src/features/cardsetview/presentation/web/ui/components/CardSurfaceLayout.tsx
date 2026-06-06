import type { CSSProperties } from "react";
import React from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { cn } from "@/lib/utils";

export type CardSurfaceFace = "question" | "answer";

type CardSurfaceLayoutProps = {
  cardLayoutMode: CardLayoutMode;
  questionNode: React.ReactNode;
  answerNode: React.ReactNode;
  flipNode?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
};

export type CardSurfaceFaceAnchorProps = {
  face: CardSurfaceFace;
  fillHeight?: boolean;
  children: React.ReactNode;
};

const resolveCardSurfaceLayoutMode = (cardLayoutMode: CardLayoutMode): string => String(cardLayoutMode);

export const CardSurfaceFaceAnchor = ({ face, fillHeight = false, children }: CardSurfaceFaceAnchorProps) => {
  return (
    <div
      data-card-surface-face={face}
      className={cn("min-w-0", fillHeight && "h-full")}
    >