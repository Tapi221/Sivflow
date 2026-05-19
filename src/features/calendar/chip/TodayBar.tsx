import { ChevronLeft, ChevronRight } from "@/ui/icons";

type Props = {
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

export const TodayBar = ({ onPrevious, onNext, onToday }: Props) => {
  return (
    <div
      className="
        inline-flex items-center
        rounded-full
        border border-[#e2e4e9]
        bg-transparent
        shadow-none
        overflow-hidden
      "
    >
      <button
        type="button"
        onClick={onPrevious}
        className="
          flex h-7 w-7 items-center justify-center
          text-[#8f929c]
          transition-colors
          hover:bg-[#eef0f3]
          hover:text-[#20242c]
        "
        aria-label="Previous"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>

      <button
        type="button"
        onClick={onToday}
        className="
          px-2.5 py-1
          text-[11px] font-medium
          leading-none
          text-[#20242c]
          whitespace-nowrap
          transition-colors
          hover:bg-[#eef0f3]
        "
      >
        Today
      </button>

      <button
        type="button"
        onClick={onNext}
        className="
          flex h-7 w-7 items-center justify-center
          text-[#8f929c]
          transition-colors
          hover:bg-[#eef0f3]
          hover:text-[#20242c]
        "
        aria-label="Next"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
};
