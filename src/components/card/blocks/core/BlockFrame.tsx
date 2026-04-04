import React from "react";
import { cn } from "@/lib/utils";

type BlockFrameVariant = "neutral" | "editor";

type BlockFrameProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  overlay?: React.ReactNode;
  accentColor?: string;
  variant?: BlockFrameVariant;
  raiseZIndex?: boolean;
};

export const BlockFrame = ({
  children,
  className,
  contentClassName,
  overlay,
  accentColor,
  variant = "neutral",
  raiseZIndex = false,
  style,
  ...props
}: BlockFrameProps) => {
  const outlineColor = accentColor
    ? `${accentColor}40`
    : "rgba(59, 130, 246, 0.35)";

  const neutralOutline =
    "inset 0 0 0 var(--card-ruled-line-px, 1px) var(--card-ruled-color, rgba(0,0,0,0.05))";
  const editorOutline = `inset 0 0 0 var(--card-ruled-line-px, 1px) ${outlineColor}`;

  return (
    <div
      {...props}
      className={cn(
        "group relative overflow-visible bg-transparent py-0 px-1.5",
        raiseZIndex && "z-40",
        className,
      )}
      style={{
        ...(style ?? {}),
        boxShadow: variant === "editor" ? editorOutline : neutralOutline,
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
