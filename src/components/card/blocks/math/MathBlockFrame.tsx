import React from "react";
import { CARD_ROW_PX } from "@constants/shared/flashcard";
import { RowSnappedRoot } from "@/components/card/frame/RowSnappedRoot";

type MathBlockFrameProps = {
  className?: string;
  children: React.ReactNode;
};

export const MathBlockFrame = ({
  className,
  children,
}: MathBlockFrameProps) => {
  return (
    <RowSnappedRoot
      rowPx={CARD_ROW_PX}
      className={`mathBlockRoot ${className ?? ""}`.trim()}
    >
      {children}
    </RowSnappedRoot>
  );
};
