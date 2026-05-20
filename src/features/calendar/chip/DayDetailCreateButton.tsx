type DayDetailCreateButtonProps = {
  onClick?: () => void;
};

export const DayDetailCreateButton = ({
  onClick,
}: DayDetailCreateButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex
        h-[36px]
        w-full
        items-center
        justify-center
        gap-1.5
        rounded-md
        bg-[#f5f6fa]
        text-[12px]
        font-medium
        text-[#8b8fa3]
        transition-colors
        hover:bg-[#eceef5]
      "
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="h-4 w-4"
      >
        <path
          d="M8 3V13M3 8H13"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>

      <span>
        新しい予定を作成
      </span>
    </button>
  );
};