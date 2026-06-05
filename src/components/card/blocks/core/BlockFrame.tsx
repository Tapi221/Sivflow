import React from "react";
import { cn } from "@/lib/utils";

type BlockFrameVariant = "none" | "neutral" | "editor";

type BlockFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  overlay?: React.ReactNode;
  accentColor?: string;
  variant?: BlockFrameVariant;
  raiseZIndex?: boolean;
  selectionActive?: boolean;
};

const SELECTED_BLOCK_OUTLINE_COLOR = "rgba(37, 99, 235, 0.82)";
const SELECTED_BLOCK_OUTLINE_WIDTH = "1px";

const getClosestBlockId = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ?? null;
};

export const BlockFrame = ({
  children,
  className,
  contentClassName,
  overlay,
  accentColor,
  variant = "neutral",
  raiseZIndex = false,
  selectionActive = variant === "editor",
  style,
  ...props
}: BlockFrameProps) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [isLatestSelection, setIsLatestSelection] = React.useState(false);

  React.useEffect(() => {
    if (!selectionActive) {
      setIsLatestSelection(false);
    }
  }, [selectionActive]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncLatestSelection = (event: PointerEvent | FocusEvent) => {
      const frameBlockId = frameRef.current?.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ?? null;
      if (!frameBlockId) return;
      setIsLatestSelection(getClosestBlockId(event.target) === frameBlockId);
    };

    window.addEventListener("pointerdown", syncLatestSelection, true);
    window.addEventListener("focusin", syncLatestSelection, true);

    return () => {
      window.removeEventListener("pointerdown", syncLatestSelection, true);
      window.removeEventListener("focusin", syncLatestSelection, true);
    };
  }, []);

  const shouldShowSelection = selectionActive && isLatestSelection;
  const neutralOutline = "0 0 0 var(--card-ruled-line-px, 1px) var(--card-ruled-color, rgba(0,0,0,0.05))";
  const editorOutline = `0 0 0 ${SELECTED_BLOCK_OUTLINE_WIDTH} ${SELECTED_BLOCK_OUTLINE_COLOR}`;

  const boxShadow = variant === "none" ? undefined : variant === "editor" && shouldShowSelection ? editorOutline : neutralOutline;

  return (
    <div
      {...props}
      ref={frameRef}
      data-block-accent-color={accentColor || undefined}
      data-block-selected={shouldShowSelection ? "true" : undefined}
      className={cn("group relative overflow-visible bg-transparent py-0 px-1.5", raiseZIndex && "z-40", className)}
      style={{
        ...(style ?? {}),
        boxShadow,
        borderRadius: "var(--block-frame-radius, 12px)",
      }}
    >
      {overlay}
      <div data-block-measure-root="true" className={cn("relative px-1", contentClassName)}>
        {children}
      </div>
    </div>
  );
};