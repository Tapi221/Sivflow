import type { Ref } from "react";
import { Check, Download } from "@/chip/icons";
import type { CalendarPrintRangeMode, CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
import { cn } from "@/lib/utils";



type ButtonClickPanelSchedulePrintOption = {
  value: CalendarPrintRangeMode;
  label: string;
};
type ButtonClickPanelSchedulePrintProps = {
  panelRef: Ref<HTMLDivElement>;
  label: string;
  printRangeLabel: string;
  printRangeStartDateLabel: string;
  printRangeEndDateLabel: string;
  printRangeOptions: readonly ButtonClickPanelSchedulePrintOption[];
  printRange: CalendarPrintRangeState;
  onChangePrintRangeMode: (mode: CalendarPrintRangeMode) => void;
  onChangeCustomStartDate: (value: string) => void;
  onChangeCustomEndDate: (value: string) => void;
  onPrintCalendar: () => void;
};



const PANEL_CLASS_NAME = "absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-neutral-200 bg-white p-1 text-neutral-900 shadow-sm";
const TITLE_CLASS_NAME = "px-2 pb-1 pt-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-400";
const OPTION_BUTTON_BASE_CLASS_NAME = "flex h-6 w-full items-center justify-between rounded-md px-1.5 text-xs font-semibold leading-none tracking-tight outline-none ring-0 transition-all duration-150 ease-out active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";
const OPTION_BUTTON_ACTIVE_CLASS_NAME = "bg-neutral-100 text-neutral-800";
const OPTION_BUTTON_INACTIVE_CLASS_NAME = "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800";
const DATE_GROUP_CLASS_NAME = "mt-1 grid grid-cols-2 gap-1 border-t border-neutral-200 pt-1";
const FIELD_CLASS_NAME = "flex flex-col gap-1";
const LABEL_CLASS_NAME = "px-1 text-xs font-semibold leading-none tracking-tight text-neutral-400";
const DATE_INPUT_CLASS_NAME = "h-6 w-full rounded-md border border-transparent bg-neutral-50 px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-600 outline-none ring-0 focus:border-neutral-200 focus:bg-white focus:outline-none focus:ring-0 focus-visible:outline-none";
const ACTION_CLASS_NAME = "mt-1 flex h-6 w-full items-center justify-center gap-1 rounded-md border-0 bg-transparent px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-500 outline-none ring-0 transition-all duration-150 ease-out hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";



const getOptionButtonClassName = (isActive: boolean): string => cn(OPTION_BUTTON_BASE_CLASS_NAME, isActive ? OPTION_BUTTON_ACTIVE_CLASS_NAME : OPTION_BUTTON_INACTIVE_CLASS_NAME);



const ButtonClickPanelSchedulePrint = ({
  panelRef,
  label,
  printRangeLabel,
  printRangeStartDateLabel,
  printRangeEndDateLabel,
  printRangeOptions,
  printRange,
  onChangePrintRangeMode,
  onChangeCustomStartDate,
  onChangeCustomEndDate,
  onPrintCalendar,
}: ButtonClickPanelSchedulePrintProps) => (
  <div ref={panelRef} className={PANEL_CLASS_NAME} role="dialog" aria-label={label}>
    <div className={TITLE_CLASS_NAME}>{printRangeLabel}</div>
    <div role="group" aria-label={printRangeLabel}>
      {printRangeOptions.map((option) => {
        const isActive = printRange.mode === option.value;
        return (
          <button key={option.value} type="button" className={getOptionButtonClassName(isActive)} aria-pressed={isActive} onClick={() => onChangePrintRangeMode(option.value)}>
            <span>{option.label}</span>
            {isActive && <Check className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
    {printRange.mode === "custom" && (
      <div className={DATE_GROUP_CLASS_NAME}>
        <label className={FIELD_CLASS_NAME}>
          <span className={LABEL_CLASS_NAME}>{printRangeStartDateLabel}</span>
          <input className={DATE_INPUT_CLASS_NAME} type="date" value={printRange.customStartDate} aria-label={printRangeStartDateLabel} title={printRangeStartDateLabel} onChange={(event) => onChangeCustomStartDate(event.target.value)} />
        </label>
        <label className={FIELD_CLASS_NAME}>
          <span className={LABEL_CLASS_NAME}>{printRangeEndDateLabel}</span>
          <input className={DATE_INPUT_CLASS_NAME} type="date" value={printRange.customEndDate} aria-label={printRangeEndDateLabel} title={printRangeEndDateLabel} onChange={(event) => onChangeCustomEndDate(event.target.value)} />
        </label>
      </div>
    )}
    <button type="button" className={ACTION_CLASS_NAME} onClick={onPrintCalendar}>
      <Download className="h-3 w-3" />
      <span>{label}</span>
    </button>
  </div>
);



export { ButtonClickPanelSchedulePrint };


export type { ButtonClickPanelSchedulePrintOption, ButtonClickPanelSchedulePrintProps };
