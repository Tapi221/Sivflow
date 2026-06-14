type FilterChipProps = {
  onClick?: () => void;
};



const FilterChip = ({ onClick }: FilterChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-600"
      title="Filter"
      aria-label="Filter"
    >
      <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0">
        <path d="M1.5 4h11M3.5 7h7M5.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="min-w-0 truncate whitespace-nowrap">Filter</span>
    </button>
  );
};



export { FilterChip };
