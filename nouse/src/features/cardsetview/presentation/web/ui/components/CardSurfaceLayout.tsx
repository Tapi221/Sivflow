import React from "react";
import { cn } from "@web-renderer/lib/utils";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";



type CardSurfaceFace = "question" | "answer";
type CardSurfaceLayoutProps = {
  cardLayoutMode: CardLayoutMode;
  questionNode: React.ReactNode;
  answerNode: React.ReactNode;
  flipNode?: React.ReactNode;
  className?: string;
};



const CardSurfaceLayout = ({ cardLayoutMode, questionNode, answerNode, flipNode, className }: CardSurfaceLayoutProps) => {
  if (cardLayoutMode === "split") {
    return <div className={cn("grid min-w-0 grid-cols-2 items-start gap-4", className)}>{questionNode}{answerNode}</div>;
  }

  if (cardLayoutMode === "stack") {
    return <div className={cn("grid min-w-0 grid-cols-1 items-start gap-4", className)}>{questionNode}{answerNode}</div>;
  }

  return flipNode ?? questionNode;
};



export { CardSurfaceLayout };


export type { CardSurfaceFace };
