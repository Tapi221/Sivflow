import { cn } from "@/lib/utils";

type GcalRelinkPanelProps = {
  message?: string;
  detail?: string | null;
  onReconnect: () => void;
  className?: string;
};

export const GcalRelinkPanel = ({
  message = "Google Calendar を自動復旧中です。",
  detail,
  onReconnect,
  className,
}: GcalRelinkPanelProps) => {
  return (
    <div
      className={cn(
        "mt-1 flex items-start justify-between gap-2 rounded-[12px] bg-[#f7f7f7] px-3 py-1.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] leading-relaxed text-[#8c8c8c]">
          {message}
        </p>
        {detail ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#b06a6a]">
            {detail}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full border border-[#eeeeee] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-[#f7f7f7]"
        onClick={onReconnect}
      >
        再試行
      </button>
    </div>
  );
};
