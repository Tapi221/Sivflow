import React from "react";

import { getTagColorStyle, type TagColorKey } from "@/features/tag/tagColor";

import { X } from "@/ui/icons";

import { cn } from "@/lib/utils";

interface TagBadgeProps {
  label: string;
  colorKey?: TagColorKey;
  selected?: boolean;
  className?: string;
  textClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

export const TagBadge = ({
  label,
  colorKey,
  selected = false,
  className,
  textClassName,
  onClick,
  onRemove,
  removeAriaLabel,
}: TagBadgeProps) => {
  const resolvedColorStyle = getTagColorStyle(colorKey);

  const displayLabel = label.startsWith("#") ? label : `#${label}`;

  const content = (
    <>
      <span className={cn("truncate", textClassName)}>{displayLabel}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={removeAriaLabel ?? `${displayLabel}を削除`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="ds-tag-badge__remove grid h-[var(--ds-semantic-tag-remove-button-size)] w-[var(--ds-semantic-tag-remove-button-size)] place-items-center rounded-full"
        >
          <X className="h-[var(--ds-semantic-tag-remove-icon-size)] w-[var(--ds-semantic-tag-remove-icon-size)]" />
        </button>
      )}
    </>
  );

  const rootClassName = cn(
    "ds-tag-badge inline-flex max-w-full items-center align-middle",
    onClick &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-[var(--ds-semantic-tag-focus-ring-width)] focus-visible:ring-primary-500/40",
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
    <span
      className={rootClassName}
      data-selected={selected}
      style={resolvedColorStyle}
    >
      {content}
    </span>
  );
};
