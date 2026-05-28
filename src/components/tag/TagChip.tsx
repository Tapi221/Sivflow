import React from "react";
import type { TagColorKey } from "@/chip/tag/tagColor";
import { TagBadge } from "./TagBadge";
import { cn } from "@/lib/utils";

interface TagChipProps {
  label: string;
  colorKey?: TagColorKey;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

export const TagChip = ({
  label,
  colorKey,
  className,
  badgeClassName,
  onClick,
  onRemove,
  removeAriaLabel,
}: TagChipProps) => {
  return (
    <TagBadge
      label={label}
      colorKey={colorKey}
      className={cn("ds-tag-chip", className, badgeClassName)}
      onClick={onClick}
      onRemove={onRemove}
      removeAriaLabel={removeAriaLabel}
    />
  );
};
