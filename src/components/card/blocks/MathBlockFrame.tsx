import React from "react";
import { CARD_ROW_PX } from "@/components/card/common/constants";
import { RowSnappedRoot } from "@/components/card/frame/RowSnappedRoot";

type MathBlockFrameProps = {
  className?: string;
  children: React.ReactNode;
};

export function MathBlockFrame({ className, children }: MathBlockFrameProps) {
  return (
    <RowSnappedRoot
      rowPx={CARD_ROW_PX}
      className={`mathBlockRoot ${className ?? ""}`.trim()}
    >
      {children}
    </RowSnappedRoot>
  );
}




