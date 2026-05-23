type FilterChipProps = {
  onClick?: () => void;
};

export const FilterChip = ({ onClick }: FilterChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-[#eeeeee] bg-white px-2.5 py-1 text-[12px] font-medium text-[#8f929c] transition-colors hover:bg-[#fafafa] hover:text-[#4c5361]"
    >
      <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
        <path
          d="M1.5 4h11M3.5 7h7M5.5 10h3"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      Filter
    </button>
  );
};