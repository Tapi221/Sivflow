import { CalendarIcon } from "@/chip/icons/icons.sidebar";

type DateFilterChipProps = {
  label: string;
  onClear: () => void;
};

const DateFilterChip = ({ label, onClear }: DateFilterChipProps) => {
  return (<span className="flex min-w-0 max-w-[122px] shrink items-center gap-1.5 overflow-hidden rounded-full border border-[#eee] bg-white px-2.5 py-1 text-[12px] font-medium text-[#3a3a3c]"> <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#9aa0aa]" /> <span className="min-w-0 truncate whitespace-nowrap" title={label}>{label}</span> <button type="button" onClick={onClear} className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#9aa0aa] transition-colors hover:text-[#4c5361]" aria-label="日付フィルターを解除" > <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5"> <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /> </svg> </button> </span>);
};

export { DateFilterChip };
