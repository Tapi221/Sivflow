import React from "react";
import { CARD_ROW_PX } from "@constants/shared/flashcard";
import { RowSnappedRoot } from "@/components/card/frame/RowSnappedRoot";

type CodeBlockFrameProps = {
  variant?: "viewer" | "editor";
  languageLabel?: string;
  languageTitle?: string;

  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

export const CodeBlockFrame: React.FC<CodeBlockFrameProps> = ({
  variant = "viewer",
  languageLabel,
  languageTitle,
  headerLeft,
  headerRight,
  children,
}) => {
  const showLangLabel = !!languageLabel && !headerLeft;

  return (
    <div className="codeBlockOuter">
      <RowSnappedRoot
        rowPx={CARD_ROW_PX}
        className={`codeBlockRoot codeBlockRoot--${variant} relative group overflow-hidden`}
      >
        {showLangLabel && (
          <div
            className="absolute z-20"
            style={{
              left: "var(--code-header-inset-x, 10px)",
              top: "var(--code-header-inset-y, 6px)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Language: ${languageTitle ?? languageLabel}`}
          >
            <span className="codeBlockLang">{languageLabel}</span>
          </div>
        )}

        {headerLeft && (
          <div
            className="absolute z-20"
            style={{
              left: "var(--code-header-inset-x, 10px)",
              top: "var(--code-header-inset-y, 6px)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {headerLeft}
          </div>
        )}

        {headerRight && (
          <div
            className="absolute z-20"
            style={{
              right: "var(--code-header-inset-x, 10px)",
              top: "var(--code-header-inset-y, 6px)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {headerRight}
          </div>
        )}

        <div className="codeBlockBody codeBlockBody--withHeader relative">
          {children}
        </div>
      </RowSnappedRoot>
    </div>
  );
};