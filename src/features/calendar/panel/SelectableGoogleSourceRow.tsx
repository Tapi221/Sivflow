import { AnimatedCircleCheckbox } from "@/chip/checkbox/AnimatedCircleCheckbox";
import { cn } from "@/lib/utils";

export const GOOGLE_SOURCE_ROW_CLASS_NAME =
  "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-5 text-left";

type SelectableGoogleSourceRowProps = {
  id: string;
  label: string;
  checked: boolean;
  color: string;
  onToggle: (id: string) => void;
};

export const SelectableGoogleSourceRow = ({
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
      <AnimatedCircleCheckbox checked={checked} color={color} />

      <span className="truncate text-[12px] font-medium text-[#b8b8b8]">
        {label}
      </span>
    </button>
  );
};
