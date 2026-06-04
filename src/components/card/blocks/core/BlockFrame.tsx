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
  const neutralOutline =
    "inset 0 0 0 var(--card-ruled-line-px, 1px) var(--card-ruled-color, rgba(0,0,0,0.05))";
  const editorOutline = `inset 0 0 0 var(--card-ruled-line-px, 1px) ${SELECTED_BLOCK_OUTLINE_COLOR}`;

  const boxShadow =
    variant === "none"
      ? undefined
      : variant === "editor"
        ? editorOutline
        : neutralOutline;

  return (
    <div
      {...props}
      data-block-accent-color={accentColor || undefined}
      data-block-frame-variant={variant}
      data-block-selected={selectionActive ? "true" : undefined}
      className={cn(
        "group relative overflow-visible bg-transparent py-0 px-1.5",
        raiseZIndex && "z-40",
        className,
      )}
      style={{
        ...(style ?? {}),
        boxShadow,
        borderRadius: "var(--block-frame-radius, 12px)",
      }}
    >
      {overlay}
      <div
        data-block-measure-root="true"
        className={cn("relative px-1", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
};
