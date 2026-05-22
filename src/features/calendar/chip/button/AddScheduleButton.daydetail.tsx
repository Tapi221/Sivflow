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
        "group flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d1d1d6]/70 bg-white/95 px-4 text-[13px] font-semibold tracking-[-0.01em] text-[#007aff] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-xl",
        "transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out hover:border-[#007aff]/30 hover:bg-white hover:shadow-[0_4px_14px_rgba(0,122,255,0.14)] active:translate-y-px active:bg-[#f7fbff]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff]/25",
        className,
      )}
      aria-label="予定を追加"
    >
      <span
        aria-hidden="true"
        className="text-[18px] leading-none text-current transition-transform duration-150 ease-out group-hover:scale-105"
      >
        +
      </span>
      <span>予定を追加</span>
    </button>
  );
};
