import React from 'react';
import { cn } from '@/lib/utils';
import { TagBadge } from '@/components/tag/TagBadge';

interface TagChipProps {
  label: string;
  colorClass?: string;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

export function TagChip({
  label,
  colorClass,
  className,
  badgeClassName,
  onClick,
  onRemove,
  removeAriaLabel,
}: TagChipProps) {
  return (
    <TagBadge
      label={label}
      size="xs"
      colorClass={colorClass}
      className={cn('max-w-full', className, badgeClassName)}
      onClick={onClick}
      onRemove={onRemove}
      removeAriaLabel={removeAriaLabel}
    />
  );
}
