import { CreateActionPlusIcon } from "@/chip/icon/CreateActionPlusIcon";
import { cn } from "@/lib/utils";

type DayDetailCreateButtonProps = {
  onClick?: () => void;
  className?: string;
};

export const DayDetailCreateButton = ({
  onClick,
  className,
}: DayDetailCreateButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-[#dfe3eb] bg-white/95 px-4 text-[13px] font-semibold tracking-[-0.01em] text-[#007aff] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl",
        "transition-all duration-150 ease-out hover:border-[#cfd6e2] hover:bg-white hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_28px_rgba(15,23,42,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25",
        className,
      )}
      aria-label="予定を追加"
    >
      <CreateActionPlusIcon />
      <span>予定を追加</span>
    </button>
  );
};