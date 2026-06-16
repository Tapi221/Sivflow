import { TYPOGRAPHY_FONT_SIZE_PX } from "@shared/design-tokens/Typography";
import { TEXT_BLOCK_CONTENT_CLASS } from "@web-renderer/components/card/blocks/text/textBlockStyles";
import { buildTypographyStyle, mergeStyles } from "@web-renderer/components/card/common/cardSetViewZoom";
import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties, KeyboardEventHandler, MouseEventHandler } from "react";
import { MarkdownBlockView } from "./MarkdownBlockPreview";



type MarkdownBlockDisplayProps = {
  markdown: string;
  emptyPlaceholder?: string;
  className?: string;
  previewClassName?: string;
  bleedX?: boolean;
  style?: CSSProperties;
  interactive?: boolean;
  tabIndex?: number;
  role?: string;
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  zoom?: number;
  "data-testid"?: string;
};



const normalizeMarkdownBlockValue = (input: string) =>
  String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}$/g, "\n\n")
    .replace(/\n+$/g, "");



const MarkdownBlockDisplay = ({ markdown, emptyPlaceholder = "Markdownを入力...", className, previewClassName, bleedX = false, style, interactive = false, tabIndex, role, ariaLabel, onClick, onKeyDown, zoom, "data-testid": dataTestId }: MarkdownBlockDisplayProps) => {
  const normalizedMarkdown = normalizeMarkdownBlockValue(markdown);
  const isEmpty = normalizedMarkdown.trim().length === 0;

  const emptyStyle = mergeStyles(
    buildTypographyStyle({
      fontSizePx: TYPOGRAPHY_FONT_SIZE_PX.md,
      lineHeightPx: 24,
      zoom,
    }),
    style,
  );

  return (
    <div className={cn("px-0 py-0", className)}>
      <div className={cn("markdownBlockPreview bg-transparent border-0 rounded-lg overflow-visible p-0", interactive && "cursor-text", previewClassName)} data-testid={dataTestId} tabIndex={tabIndex} role={role} aria-label={ariaLabel} onClick={onClick} onKeyDown={onKeyDown}>
        {isEmpty ? (
          <div className={cn(TEXT_BLOCK_CONTENT_CLASS, "min-h-6 text-slate-300")} style={emptyStyle}>
            {emptyPlaceholder}
          </div>
        ) : (
          <MarkdownBlockView md={normalizedMarkdown} className="markdownBlockCardView" bleedX={bleedX} style={style} zoom={zoom} />
        )}
      </div>
    </div>
  );
};



export { MarkdownBlockDisplay };
