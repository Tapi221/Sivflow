import { TYPOGRAPHY_FONT_SIZE_PX } from "@shared/design-tokens/Typography";
import { buildTypographyStyle, mergeStyles } from "@web-renderer/components/card/common/cardSetViewZoom";
import { cn } from "@web-renderer/lib/utils";
import { MathRenderer } from "./MathBlockContent";



type MathBlockPreviewPaneProps = {
  latex: string;
  displayMode?: "block" | "inline";
  interactive?: boolean;
  onActivate?: () => void;
  showPlaceholder?: boolean;
  placeholder?: string;
  className?: string;
  zoom?: number;
};



const MathBlockPreviewPane = ({ latex, displayMode = "block", interactive = false, onActivate, showPlaceholder = false, placeholder, className, zoom }: MathBlockPreviewPaneProps) => {
  const typographyStyle = buildTypographyStyle({ fontSizePx: TYPOGRAPHY_FONT_SIZE_PX.md, lineHeightPx: 24, zoom });

  return (
    <div
      className={cn(interactive && "cursor-text", className)}
      style={mergeStyles(typographyStyle)}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? "数式を編集" : undefined}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={
        interactive
          ? (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onActivate?.();
          }
          : undefined
      }
    >
      <MathRenderer
        latex={latex}
        displayMode={displayMode}
        showPlaceholder={showPlaceholder}
        placeholder={placeholder}
      />
    </div>
  );
};



export { MathBlockPreviewPane };
