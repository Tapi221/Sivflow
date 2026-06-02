import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};

type SourceRowMarkerProps = {
  checked: boolean;
  color: string;
};

const GOOGLE_SOURCE_ROW_CLASS_NAME = "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-2 text-left";
const SOURCE_ROW_CHECKED_TEXT_CLASS_NAME = "text-[#5f6672]";
const SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME = "text-[#b3b7be]";
const SOURCE_ROW_MARKER_CLASS_NAME = "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border";
const SOURCE_ROW_MARKER_CHECK_CLASS_NAME = "h-2 w-1.5 translate-y-[-1px] rotate-45 border-b-[1.6px] border-r-[1.6px] border-current";
const SOURCE_ROW_UNCHECKED_MARKER_COLOR = "#c7c7cc";

const createSourceRowMarkerStyle = (color: string, checked: boolean): CSSProperties => ({
  "--source-row-marker-color": checked ? color : SOURCE_ROW_UNCHECKED_MARKER_COLOR,
  backgroundColor: checked ? "color-mix(in srgb, var(--source-row-marker-color) 12%, white 88%)" : "transparent",
  borderColor: checked ? "color-mix(in srgb, var(--source-row-marker-color) 52%, white 48%)" : "color-mix(in srgb, var(--source-row-marker-color) 38%, white 62%)",
  color: checked ? "color-mix(in srgb, var(--source-row-marker-color) 78%, #4f5663 22%)" : "transparent",
} as CSSProperties);

const SourceRowMarker = ({ checked, color }: SourceRowMarkerProps) => {
  return (
    <span
      className={cn(SOURCE_ROW_MARKER_CLASS_NAME, !checked && "opacity-80")}
      style={createSourceRowMarkerStyle(color, checked)}
      aria-hidden="true"
    >
      <span className={cn(SOURCE_ROW_MARKER_CHECK_CLASS_NAME, !checked && "opacity-0")} />
    </span>
  );
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
      <SourceRowMarker checked={checked} color={color} />

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
