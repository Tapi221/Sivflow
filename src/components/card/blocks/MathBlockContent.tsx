import React from "react";
import { cn } from "@/lib/utils";
import { MathRenderer } from "./MathRenderer";
import { MathBlockFrame } from "./MathBlockFrame";
import { BLOCK_BODY_TEXT_COLOR_CLASS } from "./textBlockStyles";

interface MathBlockContentProps {
  latex: string;
  displayMode?: "block" | "inline";
  className?: string;
  showPlaceholder?: boolean;
  placeholder?: string;
}

export const MathBlockContent: React.FC<MathBlockContentProps> = ({
  latex,
  displayMode = "block",
  className,
  showPlaceholder = false,
  placeholder = "数式を入力...",
}) => {
  const hasLatex = Boolean(latex?.trim());

  if (!hasLatex && showPlaceholder) {
    return (
      <div className={cn("text-[12px] text-slate-400 px-1 py-2", className)}>
        {placeholder}
      </div>
    );
  }

  if (!hasLatex) return null;

  return (
    <MathBlockFrame
      className={cn(
        "bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[50px] overflow-x-auto overflow-y-hidden flex justify-center",
        className,
      )}
    >
      <MathRenderer
        latex={latex}
        displayMode={displayMode}
        className={BLOCK_BODY_TEXT_COLOR_CLASS}
      />
    </MathBlockFrame>
  );
};



