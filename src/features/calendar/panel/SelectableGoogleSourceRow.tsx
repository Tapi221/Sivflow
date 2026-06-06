import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};

const GOOGLE_SOURCE_ROW_CLASS_NAME = "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-2 text-left";
const SOURCE_ROW_CHECKED_TEXT_CLASS_NAME = "text-[#85827e]";
const SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME = "text-[#85827e] opacity-70";
const SOURCE_ROW_SWITCH_CLASS_NAME = "mr-0";

type SourceRowSwitchStyle = CSSProperties & {
  "--ds-semantic-color-action-primary": string;
};

const createSourceRowSwitchStyle = (color: string): SourceRowSwitchStyle => ({
  "--ds-semantic-color-action-primary": color,
} as SourceRowSwitchStyle);

const SelectableGoogleSourceRow = ({ id, label, checked, color, onToggle }: SelectableGoogleSourceRowProps) => {
  const handleToggle = () => {
    onToggle(id);
  };

  const handleSwitchClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    handleToggle();
  };

  return (
    <div role="button" tabIndex={0} className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, "cursor-default transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7d7d7]")} onClick={handleToggle} onKeyDown={handleRowKeyDown} aria-pressed={checked}>
      <Switch checked={checked} onCheckedChange={handleToggle} onClick={handleSwitchClick} className={SOURCE_ROW_SWITCH_CLASS_NAME} style={createSourceRowSwitchStyle(color)} aria-label={`${label} を${checked ? "非表示" : "表示"}`} />
      <span className={cn("truncate text-[12px] font-medium", checked ? SOURCE_ROW_CHECKED_TEXT_CLASS_NAME : SOURCE_ROW_UNCHECKED_TEXT_CLASS_NAME)}>{label}</span>
    </div>
  );
};

export { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow };
