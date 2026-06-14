import { format } from "date-fns";
import { useDateFnsLocale, useT } from "@shared/i18n/useT";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "@/ui/icons";

type Props = {
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

const TODAY_NAV_BUTTON_CLASS_NAME =
  "relative z-10 flex h-7 min-h-0 w-6 min-w-0 shrink-0 items-center justify-center rounded-none p-0 appearance-none select-none text-[#c7c7c7] outline-none ring-0 transition-[color,transform] duration-150 ease-out hover:bg-transparent hover:text-[#2f343b] active:scale-[0.94] focus:outline-none focus:ring-0 focus-visible:bg-transparent focus-visible:text-[#2f343b] focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";
const TODAY_BUTTON_CLASS_NAME =
  "relative z-10 flex h-7 min-h-0 min-w-12 max-w-20 items-center justify-center overflow-hidden rounded-none border-0 bg-transparent px-1 text-sm font-semibold leading-none tracking-tight text-[#85827e] shadow-none outline-none ring-0 transition-[color,transform] duration-150 ease-out hover:bg-transparent hover:text-[#2f343b] active:scale-[0.97] focus:outline-none focus:ring-0 focus-visible:bg-transparent focus-visible:text-[#2f343b] focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";

const TodayBar = ({ onPrevious, onNext, onToday, className }: Props) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const todayTooltipLabel = format(new Date(), t.todayTooltipDateFormat, {
    locale: dateFnsLocale,
  });
  return (
    <div className={cn("relative inline-grid h-7 w-max grid-flow-col items-center gap-1.5 rounded-none bg-transparent p-0", className)}>
      <button
        type="button"
        onClick={onPrevious}
        className={TODAY_NAV_BUTTON_CLASS_NAME}
        aria-label={t.previousLabel}
        title={t.previousLabel}
      >
        <ChevronLeft className="h-4 w-4" />
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
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export { TodayBar };
