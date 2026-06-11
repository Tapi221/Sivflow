import React from "react";
import { CARD_ROW_PX } from "@/domain/card/cardGeometry.constants";
import { RowSnappedRoot } from "@/components/card/frame/RowSnappedRoot";



type MathBlockFrameProps = {
  className?: string;
  children: React.ReactNode;
};



const MathBlockFrame = ({ className, children }: MathBlockFrameProps) => {
  return (<RowSnappedRoot rowPx={CARD_ROW_PX} className={`mathBlockRoot ${className ?? ""}`.trim()} > {children} </RowSnappedRoot>);
};



export { MathBlockFrame };
