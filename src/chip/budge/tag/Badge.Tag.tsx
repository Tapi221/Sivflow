import type { TagColorKey } from "@shared/design-tokens/color/Color.Tag";
import type { SVGProps } from "react";
import { getTagColorStyle } from "@/chip/budge/tag/tagColor";
import { X } from "@/chip/icons/icons";
import { cn } from "@/lib/utils";

type TagBadgeProps = {
  label: string;
  colorKey?: TagColorKey;
  selected?: boolean;
  className?: string;
  textClassName?: string;
  onClick?: () => void;
  onRemove?: () => void;
  removeAriaLabel?: string;
};

const LONG_DOT_SEQUENCE_PATTERN = /[.。．]{4,}/g;
const TAG_BADGE_ROOT_CLASS_NAME = "inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 align-middle text-xs font-semibold leading-4 tracking-normal shadow-none transition-[opacity,transform] duration-150";
const TAG_BADGE_INTERACTIVE_CLASS_NAME = "cursor-pointer appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30";
const TAG_BADGE_SELECTED_CLASS_NAME = "ring-2 ring-primary-500/20";
const TAG_BADGE_TEXT_CLASS_NAME = "min-w-0 truncate opacity-70";
const TAG_BADGE_REMOVE_CLASS_NAME = "grid h-4 w-4 place-items-center rounded-full text-current opacity-60 transition-[background-color,opacity] duration-150 hover:bg-current/10 hover:opacity-100";
const TAG_BADGE_REMOVE_ICON_CLASS_NAME = "h-3 w-3";

const normalizeTagText = (value: string): string => {
  return value.replace(LONG_DOT_SEQUENCE_PATTERN, "...");
};

const TagHashIcon = ({ className }: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    className={className}
  >
    <path d="M4.4 2.2 3.6 9.8" />
    <path d="M8.4 2.2 7.6 9.8" />
    <path d="M2.4 4.6h7.2" />
    <path d="M2 7.4h7.2" />
  </svg>
);
const TagBadge = ({
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
  const rawTextLabel = label.startsWith("#") ? label.slice(1) : label;
  const textLabel = normalizeTagText(rawTextLabel);
  const displayLabel = `#${textLabel}`;
  const hasRemoveAction = onRemove !== undefined;
  const content = (
    <>
      <TagHashIcon className="h-3 w-3 shrink-0 opacity-70" />
      <span className={cn(TAG_BADGE_TEXT_CLASS_NAME, textClassName)}>{textLabel}</span>
      {hasRemoveAction && (
        <button
          type="button"
          aria-label={removeAriaLabel ?? `${displayLabel}を削除`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className={TAG_BADGE_REMOVE_CLASS_NAME}
        >
          <X className={TAG_BADGE_REMOVE_ICON_CLASS_NAME} />
        </button>
      )}
    </>
  );
  const rootClassName = cn(
    TAG_BADGE_ROOT_CLASS_NAME,
    onClick !== undefined && TAG_BADGE_INTERACTIVE_CLASS_NAME,
    selected && TAG_BADGE_SELECTED_CLASS_NAME,
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

export { TagBadge };
export type { TagBadgeProps };
