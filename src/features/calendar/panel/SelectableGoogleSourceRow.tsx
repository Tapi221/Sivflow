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
const SOURCE_ROW_CHECKED_TEXT_CLASS_NAME = "text-[#85827e]";
const SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME = "text-[#85827e] opacity-70";
const SOURCE_ROW_MARKER_CLASS_NAME = "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3.5px] border transition-all duration-150";
const SOURCE_ROW_MARKER_CHECK_CLASS_NAME = "h-2.5 w-2.5 text-white transition-opacity duration-150";
const SOURCE_ROW_UNCHECKED_MARKER_COLOR = "#c7c7cc";

const createSourceRowMarkerStyle = (color: string, checked: boolean): CSSProperties => ({
  "--source-row-marker-color": checked ? color : SOURCE_ROW_UNCHECKED_MARKER_COLOR,
  backgroundColor: checked ? "color-mix(in srgb, var(--source-row-marker-color) 58%, white 42%)" : "transparent",
  borderColor: checked ? "transparent" : "color-mix(in srgb, var(--source-row-marker-color) 38%, white 62%)",
  color: checked ? "#ffffff" : "transparent",
} as CSSProperties);

const SourceRowMarker = ({ checked, color }: SourceRowMarkerProps) => {
  return (
    <span className={cn(SOURCE_ROW_MARKER_CLASS_NAME, !checked && "opacity-80")} style={createSourceRowMarkerStyle(color, checked)} aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(SOURCE_ROW_MARKER_CHECK_CLASS_NAME, !checked && "opacity-0")}>
        <path d="M3.25 8.35L6.55 11.55L12.9 4.65" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
};

const SelectableGoogleSourceRow = ({ id, label, checked, color, onToggle }: SelectableGoogleSourceRowProps) => {
  return (
    <button type="button" className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, "transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]")} onClick={() => onToggle(id)} aria-pressed={checked}>
      <SourceRowMarker checked={checked} color={color} />
      <span className={cn("truncate text-[12px] font-medium", checked ? SOURCE_ROW_CHECKED_TEXT_CLASS_NAME : SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME)}>{label}</span>
    </button>
  );
};

export { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow };
