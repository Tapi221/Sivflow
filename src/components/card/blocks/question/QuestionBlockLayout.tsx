import { BlockInset } from "@/components/card/blocks/editor/BlockInset";
import { cn } from "@/lib/utils";
import React from "react";

type QuestionBlockLayoutProps = {
  questionContent: React.ReactNode;
  answerContent: React.ReactNode;
  className?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  answerContainerProps?: React.HTMLAttributes<HTMLDivElement>;
  answerOverlay?: React.ReactNode;
};

export function QuestionBlockLayout({
  questionContent,
  answerContent,
  className,
  containerRef,
  containerProps,
  answerContainerProps,
  answerOverlay,
}: QuestionBlockLayoutProps) {
  return (
    <BlockInset variant="question">
      <div
        ref={containerRef}
        className={cn(
          "rounded-r-md border-l-2 border-amber-400 bg-amber-50 pl-1.5 pr-1 py-1",
          className,
        )}
        {...containerProps}
      >
        <div className="flex items-start gap-1 mb-1">
          <span className="shrink-0 text-[10px] font-bold text-amber-500 leading-none mt-[2px]">
            Q.
          </span>
          {questionContent}
        </div>

        <div
          className="flex items-start gap-1 border-t border-amber-200/60 pt-1"
          {...answerContainerProps}
        >
          <span className="shrink-0 text-[10px] font-bold text-slate-400 leading-none mt-[2px]">
            A.
          </span>
          <div className="flex-1 relative">
            {answerContent}
            {answerOverlay}
          </div>
        </div>
      </div>
    </BlockInset>
  );
}
