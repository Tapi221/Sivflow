import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedCircleCheckbox } from "@/chip/checkbox/AnimatedCircleCheckbox";
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
const TAG_MARK_STROKE_WIDTH = 1.8;
const TAG_MARK_BORDER_WIDTH = 1.8;

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

  const textLabel = label.startsWith("#") ? label.slice(1) : label;
  const { isOverflowing, textRef } = useTextOverflow(textLabel);

  const content = (
    <>
      <AnimatedCircleCheckbox
        checked
        color="currentColor"
        variant="outline"
        strokeWidth={TAG_MARK_STROKE_WIDTH}
        borderWidth={TAG_MARK_BORDER_WIDTH}
        className="ds-tag-badge__mark h-[1.16em] w-[1.16em] opacity-80"
      />
      <span
        ref={textRef}
        className={cn("ds-tag-badge__text min-w-0 overflow-hidden whitespace-nowrap opacity-70", textClassName)}
        style={isOverflowing ? TAG_TEXT_FADE_STYLE : undefined}
      >
        {textLabel}
      </span>
      {onRemove && (
        <button
          type="button"
          aria-label={removeAriaLabel ?? `${textLabel}を削除`}
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

export { TagBadge };
