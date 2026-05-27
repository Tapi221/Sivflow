import { memo } from "react";
import { format, startOfMonth } from "date-fns";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";

type MiniCalendarSectionProps = {
  monthDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

const MINI_CALENDAR_NAV_BUTTON_CLASS_NAME =
  "flex h-7 w-7 items-center justify-center rounded-full text-[#b7b7b7] transition-all hover:bg-[#f7f7f7] hover:text-[#8c8c8c] active:scale-[0.94] active:bg-[#f1f1f1]";

const MINI_CALENDAR_DIVIDER_CLASS_NAME = "mt-2 h-px w-full shrink-0 bg-[#eeeeee]";

const IconChevronLeft = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 12L6 8L10 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChevronRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const isSameMonthValue = (left: Date, right: Date): boolean => {
  return startOfMonth(left).getTime() === startOfMonth(right).getTime();
};

const MiniCalendarSectionBase = ({
  monthDate,
  onPreviousMonth,
  onNextMonth,
}: MiniCalendarSectionProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();

  return (
    <>
      <section className="flex w-full shrink-0 flex-col pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="ml-3 text-[13px] font-extrabold tracking-[-0.01em] text-[#4a4a4a]">
            {format(monthDate, monthLabelFormat, { locale: dateFnsLocale })}
          </span>

          <div className="flex items-center gap-1">
            <HoverTooltip label={t.previousMonthLabel} side="top">
              <button
                type="button"
                className={MINI_CALENDAR_NAV_BUTTON_CLASS_NAME}
                onClick={onPreviousMonth}
                aria-label={t.previousMonthLabel}
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
            </HoverTooltip>

            <HoverTooltip label={t.nextMonthLabel} side="top">
              <button
                type="button"
                className={MINI_CALENDAR_NAV_BUTTON_CLASS_NAME}
                onClick={onNextMonth}
                aria-label={t.nextMonthLabel}
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </HoverTooltip>
          </div>
        </div>
      </section>

      <div className={MINI_CALENDAR_DIVIDER_CLASS_NAME} />
    </>
  );
};

export const MiniCalendarSection = memo(MiniCalendarSectionBase, (previous, next) => {
  return (
    isSameMonthValue(previous.monthDate, next.monthDate) &&
    previous.onPreviousMonth === next.onPreviousMonth &&
    previous.onNextMonth === next.onNextMonth
  );
});
