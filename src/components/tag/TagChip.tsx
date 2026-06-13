import React from "react";
import type { TagColorKey } from "@/chip/tag/tagColor";
import { cn } from "@/lib/utils";
import { TagBadge } from "@/components/tag/TagBadge";

interface TagChipProps {
  label: string;
  colorKey?: TagColorKey;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

const TagChip = ({
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

export { TagChip };
export type { TagChipProps };
