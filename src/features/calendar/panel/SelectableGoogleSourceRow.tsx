import type { CSSProperties } from "react";
import { AnimatedCircleCheckbox } from "@/chip/checkbox/AnimatedCircleCheckbox";
import { cn } from "@/lib/utils";

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};

const GOOGLE_SOURCE_ROW_CLASS_NAME =
  "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-2 text-left";
const SOURCE_ROW_CHECKED_TEXT_CLASS_NAME = "text-[#2c2c2e]";
const SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME = "text-[#b8b8bd]";
const SOURCE_ROW_CHECKBOX_STROKE_WIDTH = 1.8;
const SOURCE_ROW_CHECKBOX_BORDER_WIDTH = 0;
const SOURCE_ROW_UNCHECKED_MARKER_CLASS_NAME = "relative h-3.5 w-3.5 shrink-0 rounded-full";
const SOURCE_ROW_UNCHECKED_MARKER_DOT_CLASS_NAME = "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full";

const createUncheckedMarkerStyle = (color: string): CSSProperties => ({
  "--source-row-marker-color": color,
  backgroundColor: "color-mix(in srgb, var(--source-row-marker-color) 13%, white 87%)",
} as CSSProperties);

const UNCHECKED_MARKER_DOT_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--source-row-marker-color) 32%, transparent)",
};

const SelectableGoogleSourceRow = ({
  id,
  label,
  checked,
  color,
  onToggle,
}: SelectableGoogleSourceRowProps) => {
  return (
    <button
      type="button"
      className={cn(
        GOOGLE_SOURCE_ROW_CLASS_NAME,
        "transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]",
      )}
      onClick={() => onToggle(id)}
      aria-pressed={checked}
    >
      {checked ? (
        <AnimatedCircleCheckbox
          checked={checked}
          color={color}
          variant="soft"
          strokeWidth={SOURCE_ROW_CHECKBOX_STROKE_WIDTH}
          borderWidth={SOURCE_ROW_CHECKBOX_BORDER_WIDTH}
        />
      ) : (
        <span
          className={SOURCE_ROW_UNCHECKED_MARKER_CLASS_NAME}
          style={createUncheckedMarkerStyle(color)}
          aria-hidden="true"
        >
          <span className={SOURCE_ROW_UNCHECKED_MARKER_DOT_CLASS_NAME} style={UNCHECKED_MARKER_DOT_STYLE} />
        </span>
      )}

      <span
        className={cn(
          "truncate text-[12px] font-medium",
          checked ? SOURCE_ROW_CHECKED_TEXT_CLASS_NAME : SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME,
        )}
      >
        {label}
      </span>
    </button>
  );
};

export { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow };
