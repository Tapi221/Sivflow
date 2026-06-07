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
};

export const CardSurface