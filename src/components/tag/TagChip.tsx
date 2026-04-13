import React from "react";
import { cn } from "@/lib/utils";
import { TagBadge } from "@/components/tag/TagBadge";
import type { TagColorKey } from "@/lib/tags/tagColor";

interface TagChipProps {
  label: string;
  colorKey?: TagColorKey;
  legacyColor?: string;
  // 互換用。将来削除予定。
  colorClass?: string;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

export const TagChip = ({
  label,
  colorKey,
  legacyColor,
  colorClass,
  className,
  badgeClassName,
  onClick,
  onRemove,
  removeAriaLabel,
}: TagChipProps) => {
  return (
    <TagBadge
      label={label}
      size="xs"
      colorKey={colorKey}
      legacyColor={legacyColor}
      colorClass={colorClass}
      className={cn("ds-tag-chip", className, badgeClassName)}
      onClick={onClick}
      onRemove={onRemove}
      removeAriaLabel={removeAriaLabel}
    />
  );
};
