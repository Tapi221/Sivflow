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

export const TagBadge = ({
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
}: TagBadgeProps) => {
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
          className="ds-tag-badge__remove ml-1 grid h-4 w-4 place-items-center rounded-full"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </>
  );

  const rootClassName = cn(
    "ds-tag-badge inline-flex max-w-full items-center border font-bold",
    sizeClassMap[size],
    selected && "scale-[1.02]",
    onClick &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={rootClassName}
        data-selected={selected}
        style={resolvedColorStyle}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={rootClassName} data-selected={selected} style={resolvedColorStyle}>
      {content}
    </span>
  );
};
