export type BoardListViewMode = "board" | "list";

type BoardListToggleButtonProps = {
  viewMode: BoardListViewMode;
  onChange: (viewMode: BoardListViewMode) => void;
};

export const BoardListToggleButton = ({
  viewMode,
  onChange,
}: BoardListToggleButtonProps) => {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[#e9eaed] bg-white">
      <button
        type="button"
        onClick={() => onChange("board")}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
          viewMode === "board"
            ? "bg-[#f0f6ff] text-[#193a5c]"
            : "text-[#8f929c] hover:bg-[#f7f8fa]"
        }`}
      >
        <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
          <rect
            x="1"
            y="1"
            width="5"
            height="12"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect
            x="8"
            y="1"
            width="5"
            height="12"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        Board
      </button>

      <div className="w-px bg-[#e9eaed]" />

      <button
        type="button"
        onClick={() => onChange("list")}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
          viewMode === "list"
            ? "bg-[#f0f6ff] text-[#193a5c]"
            : "text-[#8f929c] hover:bg-[#f7f8fa]"
        }`}
      >
        <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
          <path
            d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        List
      </button>
    </div>
  );
};