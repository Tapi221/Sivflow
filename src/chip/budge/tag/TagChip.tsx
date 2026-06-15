import type { TagColorKey } from "@shared/design-tokens/color/Color.Tag";
import { TagBadge } from "@/chip/budge/tag/Badge.Tag";
import { cn } from "@/lib/utils";

type TagChipProps = {
  label: string;
  colorKey?: TagColorKey;
  className?: string;
  badgeClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
};

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
