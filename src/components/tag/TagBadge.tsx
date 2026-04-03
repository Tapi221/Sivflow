import React from "react";
import { X } from "@/ui/icons";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TAG_COLOR_CLASS_NAME,
  getTagColorStyle,
  type TagColorKey,
} from "@/lib/tags/tagColor";

type TagBadgeSize = "xs" | "sm" | "md";

interface TagBadgeProps {
  label: string;
  colorKey?: TagColorKey;
  legacyColor?: string;
  // 互換用。将来削除予定。
  colorClass?: string;
  size?: TagBadgeSize;
  selected?: boolean;
  className?: string;
  textClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

const sizeClassMap: Record<TagBadgeSize, string> = {
  xs: "text-[10px] px-2 py-0.5 gap-1 leading-4",
  sm: "text-[11px] px-2.5 py-1 gap-1.5 leading-4",
  md: "text-xs px-3 py-1.5 gap-1.5 leading-5",
};

export function TagBadge({
  label,
  colorKey,
  legacyColor,
  colorClass,
  size = "sm",
  selected = false,
  className,
  textClassName,
  onClick,
  onRemove,
  removeAriaLabel,
}: TagBadgeProps) {
  const resolvedColorStyle =
    colorKey !== undefined
      ? getTagColorStyle(colorKey)
      : getTagColorStyle(
          legacyColor ?? colorClass ?? DEFAULT_TAG_COLOR_CLASS_NAME,
        );

  const content = (
    <>
      <span className={cn("truncate", textClassName)}>{label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={removeAriaLabel ?? `${label}を削除`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="ml-1 grid h-4 w-4 place-items-center rounded-full text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-700"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </>
  );

  const rootClassName = cn(
    "inline-flex max-w-full items-center rounded-full border font-bold surface-convex transition-all",
    sizeClassMap[size],
    selected && "ring-2 ring-primary-500/40 scale-[1.02]",
    onClick &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={rootClassName}
        style={resolvedColorStyle}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={rootClassName} style={resolvedColorStyle}>
      {content}
    </span>
  );
}

