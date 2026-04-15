import { cn } from "@/lib/utils";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import React from "react";

export type CardSurfaceLayoutProps = {
  cardLayoutMode: CardLayoutMode;
  questionNode: React.ReactNode;
  answerNode: React.ReactNode;
  flipNode?: React.ReactNode;
  className?: string;
};

export const CardSurfaceLayout = ({
  cardLayoutMode,
  questionNode,
  answerNode,
  flipNode,
  className,
}: CardSurfaceLayoutProps) => {
  if (cardLayoutMode === "flip") {
    return (
      <div
        className={cn("w-full min-w-0 max-w-full overflow-visible", className)}
      >
        {flipNode ?? questionNode}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full overflow-visible",
        cardLayoutMode === "split"
          ? "grid grid-cols-2 gap-0"
          : "flex flex-col gap-0",
        className,
      )}
    >
      <div className="min-w-0">{questionNode}</div>
      <div className="min-w-0">{answerNode}</div>
    </div>
  );
};
