import { useDateFnsLocale, useT } from "@shared/i18n/useT";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "@/chip/icons";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { cn } from "@/lib/utils";



type Props = {
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};



const TODAY_NAV_BUTTON_CLASS_NAME =
  "relative z-10 flex h-6 min-h-0 w-6 min-w-0 shrink-0 items-center justify-center rounded-md p-0 appearance-none select-none text-neutral-500 outline-none ring-0 transition-all duration-150 ease-out hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";
const TODAY_BUTTON_CLASS_NAME =
  "relative z-10 flex h-6 min-h-0 min-w-12 max-w-20 items-center justify-center overflow-hidden rounded-md border-0 bg-transparent px-2 text-xs font-semibold leading-none tracking-tight text-neutral-500 shadow-none outline-none ring-0 transition-all duration-150 ease-out hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";



const TodayBar = ({ onPrevious, onNext, onToday, className }: Props) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const todayTooltipLabel = format(new Date(), t.todayTooltipDateFormat, {
    locale: dateFnsLocale,
  });
  return (
    <div className={cn("relative inline-grid h-6 w-max grid-flow-col items-center gap-1 rounded-none bg-transparent p-0", className)}>
      <button
        type="button"
        onClick={onPrevious}
        className={TODAY_NAV_BUTTON_CLASS_NAME}
        aria-label={t.previousLabel}
        title={t.previousLabel}
      >
        <ChevronLeft className="h-3 w-3" />
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
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
};



export { TodayBar };
