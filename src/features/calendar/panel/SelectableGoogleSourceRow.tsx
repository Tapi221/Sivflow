import { SIDEBAR_COLOR } from "@shared/design-tokens/color/Color.Sidebar";
import { AnimatedCheckboxBase } from "@web-renderer/chip/checkbox/AnimatedCheckboxBase";
import { cn } from "@web-renderer/lib/utils";
import type { KeyboardEvent, MouseEvent } from "react";



type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  className?: string;
  onToggle: (id: string) => void;
};
type SelectableGoogleSourceSwitchProps = {
  label: string;
  checked: boolean;
  color: string;
  onToggle: () => void;
};



const GOOGLE_SOURCE_ROW_CLASS_NAME = "flex h-6 w-full items-center gap-1.5 overflow-hidden rounded-md px-0 text-left";
const SOURCE_ROW_CHECKED_TEXT_CLASS_NAME = "text-stone-500";
const SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME = "text-stone-500 opacity-70";
const SOURCE_ROW_SWITCH_CLASS_NAME = "mr-0";
const SOURCE_ROW_SWITCH_SIZE_CLASS_NAME = "h-3.5 w-3.5";
const SOURCE_ROW_SWITCH_CHECK_STROKE_WIDTH = 2.5;
const SOURCE_ROW_SWITCH_BORDER_WIDTH = 1.5;
const SOURCE_ROW_SWITCH_INACTIVE_BORDER_COLOR = SIDEBAR_COLOR.sourceSwitchInactiveBorder;



const SelectableGoogleSourceSwitch = ({ label, checked, color, onToggle }: SelectableGoogleSourceSwitchProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={`${label} を${checked ? "非表示" : "表示"}`} onClick={handleClick} className={cn("flex shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300", SOURCE_ROW_SWITCH_SIZE_CLASS_NAME, SOURCE_ROW_SWITCH_CLASS_NAME)}>
      <AnimatedCheckboxBase checked={checked} color={color} className={SOURCE_ROW_SWITCH_SIZE_CLASS_NAME} strokeWidth={SOURCE_ROW_SWITCH_CHECK_STROKE_WIDTH} borderWidth={SOURCE_ROW_SWITCH_BORDER_WIDTH} inactiveBorderColor={SOURCE_ROW_SWITCH_INACTIVE_BORDER_COLOR} />
    </button>
  );
};
const SelectableGoogleSourceRow = ({ id, label, checked, color, className, onToggle }: SelectableGoogleSourceRowProps) => {
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
    <div role="button" tabIndex={0} className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, "cursor-default transition-all duration-150 hover:bg-neutral-100 active:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300", className)} onClick={handleToggle} onKeyDown={handleRowKeyDown} aria-pressed={checked}>
      <SelectableGoogleSourceSwitch label={label} checked={checked} color={color} onToggle={handleToggle} />
      <span className={cn("truncate text-xs font-semibold leading-4", checked ? SOURCE_ROW_CHECKED_TEXT_CLASS_NAME : SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME)}>{label}</span>
    </div>
  );
};



export { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow };
