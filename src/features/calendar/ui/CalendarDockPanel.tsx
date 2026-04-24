import { cn } from "@/lib/utils";

type CalendarDockPanelProps = {
  onClose: () => void;
};

const CloseIcon = () => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const CalendarDockPanel = ({ onClose }: CalendarDockPanelProps) => {
  return (
    <aside
      className={cn(
        "relative z-10 ml-2 hidden h-full min-h-0 w-[280px] shrink-0 flex-col overflow-hidden",
        "rounded-[14px] border border-[#dddcd5]",
        "bg-[rgba(255,255,255,0.92)]",
        "shadow-[0_16px_36px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]",
        "backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]",
        "md:flex",
      )}
      aria-label="カレンダーパネル"
    >
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-[#e5e4dd] px-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Calendar
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition-colors hover:bg-[#f9fafb] hover:text-slate-600"
          onClick={onClose}
          aria-label="カレンダーパネルを閉じる"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="min-h-0 flex-1" />
    </aside>
  );
};
