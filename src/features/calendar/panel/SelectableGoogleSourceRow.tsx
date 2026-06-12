import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { cn } from "@/lib/utils";

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};
type SelectableGoogleSourceSwitchProps = {
  label: string;
  checked: boolean;
  color: string;
  onToggle: () => void;
};
type SourceRowSwitchStyle = CSSProperties & {
  "--calendar-source-switch-color": string;
};

const GOOGLE_SOURCE_ROW_CLASS_NAME = "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-2 text-left";
const SOURCE_ROW_CHECKED_TEXT_CLASS_NAME = "text-[#85827e]";
const SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME = "text-[#85827e] opacity-70";
const SOURCE_ROW_SWITCH_CLASS_NAME = "mr-0";

const createSourceRowSwitchStyle = (color: string): SourceRowSwitchStyle => ({
  "--calendar-source-switch-color": color,
} as SourceRowSwitchStyle);

const SelectableGoogleSourceSwitch = ({ label, checked, color, onToggle }: SelectableGoogleSourceSwitchProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={`${label} を${checked ? "非表示" : "表示"}`} onClick={handleClick} style={createSourceRowSwitchStyle(color)} className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7d7d7]", checked ? "border-[color:var(--calendar-source-switch-color)] bg-[color:var(--calendar-source-switch-color)]" : "border-[#d7d7d7] bg-white", SOURCE_ROW_SWITCH_CLASS_NAME)}>
      <span className={cn("h-2 w-2 rounded-full bg-white transition-opacity duration-150", checked ? "opacity-100" : "opacity-0")} />
    </button>
  );
};
const SelectableGoogleSourceRow = ({ id, label, checked, color, onToggle }: SelectableGoogleSourceRowProps) => {
  const handleToggle = () => {
    onToggle(id);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    handleToggle();
  };

  return (
    <div role="button" tabIndex={0} className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, "cursor-default transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7d7d7]")} onClick={handleToggle} onKeyDown={handleRowKeyDown} aria-pressed={checked}>
      <SelectableGoogleSourceSwitch label={label} checked={checked} color={color} onToggle={handleToggle} />
      <span className={cn("truncate text-[12px] font-medium", checked ? SOURCE_ROW_CHECKED_TEXT_CLASS_NAME : SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME)}>{label}</span>
    </div>
  );
};

export { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow };
