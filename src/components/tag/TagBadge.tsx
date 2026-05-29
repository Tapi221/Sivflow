import type { CSSProperties, SVGProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTagColorStyle, type TagColorKey } from "@/chip/tag/tagColor";
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

const TAG_TEXT_FADE_STYLE: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
  maskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 14px), transparent 100%)",
};

const OVERFLOW_THRESHOLD = 1;

const isElementTextOverflowing = (element: HTMLElement | null) => {
  return Boolean(element && element.scrollWidth > element.clientWidth + OVERFLOW_THRESHOLD);
};

const useTextOverflow = (value: string) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateIsOverflowing = useCallback(() => {
    setIsOverflowing(isElementTextOverflowing(textRef.current));
  }, []);

  useEffect(() => {
    const element = textRef.current;

    updateIsOverflowing();

    if (!element) {
      return undefined;
    }

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateIsOverflowing);

      return () => {
        window.removeEventListener("resize", updateIsOverflowing);
      };
    }

    const resizeObserver = new ResizeObserver(updateIsOverflowing);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateIsOverflowing, value]);

  return { isOverflowing, textRef };
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

  const textLabel = label.startsWith("#") ? label.slice(1) : label;
  const displayLabel = `#${textLabel}`;
  const { isOverflowing, textRef } = useTextOverflow(textLabel);

  const content = (
    <>
      <TagHashIcon className="h-[0.82em] w-[0.82em] shrink-0 opacity-70" />
      <span
        ref={textRef}
        className={cn("min-w-0 overflow-hidden whitespace-nowrap opacity-70", textClassName)}
        style={isOverflowing ? TAG_TEXT_FADE_STYLE : undefined}
      >
        {textLabel}
      </span>
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
    "ds-tag-badge inline-flex min-w-0 max-w-full items-center align-middle",
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
