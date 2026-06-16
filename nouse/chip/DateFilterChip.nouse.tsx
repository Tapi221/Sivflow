import { CalendarIcon } from "@web-renderer/chip/icons/icons.sidebar";

type DateFilterChipProps = {
  label: string;
  onClear: () => void;
};

const DateFilterChip = ({ label, onClear }: DateFilterChipProps) => {
  return (
    <span className="flex min-w-0 max-w-32 shrink items-center gap-1.5 overflow-hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="min-w-0 truncate whitespace-nowrap" title={label}>{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600"
        aria-label="日付フィルターを解除"
      >
        <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
};

export { DateFilterChip };
