import { useT } from "@/i18n/useT";

type NewTaskButtonProps = {
  onClick: () => void;
};

export const NewTaskButton = ({ onClick }: NewTaskButtonProps) => {
  const t = useT();

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        flex
        h-[40px]
        items-center
        justify-center
        gap-2
        rounded-[14px]
        border
        border-[#dfe3eb]
        bg-white/95
        px-4
        text-[13px]
        font-semibold
        text-[#007aff]
        shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)]
        transition-all
        duration-150
        hover:border-[#cfd6e2]
        hover:bg-white
        hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_28px_rgba(15,23,42,0.08)]
        active:scale-[0.985]
        active:bg-[#f7f8fb]
      "
    >
      <span
        className="
          flex
          h-[18px]
          w-[18px]
          items-center
          justify-center
          rounded-full
          bg-[#007aff]
          text-white
          shadow-[0_2px_6px_rgba(0,122,255,0.28)]
          transition-transform
          duration-150
          group-hover:scale-105
        "
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-3 w-3"
        >
          <path
            d="M8 3.75V12.25M3.75 8H12.25"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span>{t.addTask}</span>
    </button>
  );
};
