import { CalendarIcon } from "@/components/icons/sidebar.icons";

type DateFilterChipProps = {
  label: string;
  onClear: () => void;
};

export const DateFilterChip = ({ label, onClear }: DateFilterChipProps) => {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-[#e9eaed] bg-white px-2.5 py-1 text-[12px] font-medium text-[#25272d]">
      <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#8f929c]" />

      {label}

      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#9aa0aa] hover:text-[#4c5361]"
        aria-label="日付フィルターを解除"
      >
        <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
          <path
            d="M2 2l6 6M8 2L2 8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
};