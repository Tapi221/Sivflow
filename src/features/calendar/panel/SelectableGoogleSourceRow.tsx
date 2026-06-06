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
const SOURCE_ROW_MARKER_CLASS_NAME = "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white transition-all duration-150";
const SOURCE_ROW_MARKER_DOT_CLASS_NAME = "h-2.5 w-2.5 rounded-full bg-white transition-all duration-150";
const SOURCE_ROW_UNCHECKED_MARKER_COLOR = "#d8d8dc";
const SOURCE_ROW_MARKER_SHADOW = "0 1px 2px rgba(15, 23, 42, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.72)";

const createSourceRowMarkerStyle = (color: string, checked: boolean): CSSProperties => ({
  "--source-row-marker-color": color,
  backgroundColor: checked ? "var(--source-row-marker-color)" : "#ffffff",
  borderColor: checked ? "var(--source-row-marker-color)" : SOURCE_ROW_UNCHECKED_MARKER_COLOR,
  boxShadow: SOURCE_ROW_MARKER_SHADOW,
} as CSSProperties);

const SourceRowMarker = ({ checked, color }: SourceRowMarkerProps) => {
  return (
    <span className={SOURCE_ROW_MARKER_CLASS_NAME} style={createSourceRowMarkerStyle(color, checked)} aria-hidden="true">
      <span className={cn(SOURCE_ROW_MARKER_DOT_CLASS_NAME, checked ? "scale-100 opacity-100" : "scale-75 opacity-0")} />
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
