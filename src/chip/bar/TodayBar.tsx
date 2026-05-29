import { format } from "date-fns";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { useDateFnsLocale, useT } from "@shared/i18n/useT";

type Props = {
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

const TODAY_NAV_BUTTON_CLASS_NAME =
  "relative z-10 flex h-6 w-7 shrink-0 items-center justify-center rounded-[8px] p-0 appearance-none select-none text-[#b3b3b3] outline-none ring-0 transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-white/80 hover:text-[#8c8c8c] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none";

const TODAY_BUTTON_CLASS_NAME =
  "relative z-10 flex h-6 min-w-[50px] max-w-[86px] items-center justify-center overflow-hidden rounded-[8px] border border-[#eeeeee] bg-white px-2.5 text-[11px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none ring-0 transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:text-[#6f6f6f] hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none";

const TodayBar = ({ onPrevious, onNext, onToday, className }: Props) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const todayTooltipLabel = format(new Date(), t.todayTooltipDateFormat, {
    locale: dateFnsLocale,
  });

  return (
    <div className={cn("relative inline-grid h-7 w-max grid-flow-col items-center gap-1 rounded-[10px] bg-[#f7f7f7] p-0.5", className)}>
      <button
        type="button"
        onClick={onPrevious}
        className={TODAY_NAV_BUTTON_CLASS_NAME}
        aria-label={t.previousLabel}
        title={t.previousLabel}
      >
        <ChevronLeft className="h-2.5 w-2.5" />
      </button>

      <HoverTooltip label={todayTooltipLabel} side="bottom">
        <button
          type="button"
          onClick={onToday}
          className={TODAY_BUTTON_CLASS_NAME}
          aria-label={todayTooltipLabel}
        >
          <span className="min-w-0 truncate whitespace-nowrap">{t.todayButton}</span>
        </button>
      </HoverTooltip>

      <button
        type="button"
        onClick={onNext}
        className={TODAY_NAV_BUTTON_CLASS_NAME}
        aria-label={t.nextLabel}
        title={t.nextLabel}
      >
        <ChevronRight className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

export { TodayBar };
