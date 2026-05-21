type NewTaskButtonProps = {
  onClick: () => void;
};

export const NewTaskButton = ({ onClick }: NewTaskButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg bg-[#193a5c] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
    >
      <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
        <path
          d="M7 2.5v9M2.5 7h9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      New Task
    </button>
  );
};