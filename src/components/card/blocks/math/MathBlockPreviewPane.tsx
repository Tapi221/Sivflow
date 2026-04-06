import {
  buildTypographyStyle,
  mergeStyles,
} from "@/components/card/common/cardViewZoom";
import { cn } from "@/lib/utils";
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

export const MathBlockPreviewPane = ({
  latex,
  displayMode = "block",
  interactive = false,
  onActivate,
  showPlaceholder = false,
  placeholder,
  className,
  zoom,
}: MathBlockPreviewPaneProps) => {
  const typographyStyle = buildTypographyStyle({
    fontSizePx: 16,
    lineHeightPx: 24,
    zoom,
  });

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
