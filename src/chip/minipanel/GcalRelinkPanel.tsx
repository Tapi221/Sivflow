import { cn } from "@/lib/utils";

type GcalRelinkPanelProps = {
  onReconnect: () => void;
  className?: string;
};

export const GcalRelinkPanel = ({
  onReconnect,
  className,
}: GcalRelinkPanelProps) => {
  return (
    <div
      className={cn(
        "mt-1 rounded-[12px] bg-[#f7f7f7] px-3 py-1.5",
        className,
      )}
    >
      <p className="text-[11px] leading-relaxed text-[#8c8c8c]">
        再連携が必要です。
      </p>
      <button
        type="button"
        className="mt-1 rounded-full border border-[#eeeeee] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f7f7f7]"
        onClick={onReconnect}
      >
        再連携
      </button>
    </div>
  );
};
