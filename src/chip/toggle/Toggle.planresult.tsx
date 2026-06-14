import { cn } from "@/lib/utils";

type PlanResultMode = "plan" | "actual";
type PlanResultOption = {
  value: PlanResultMode;
  label: string;
};
type TogglePlanResultProps = {
  value: readonly PlanResultMode[];
  onChange: (value: PlanResultMode[]) => void;
  className?: string;
};

const PLAN_RESULT_OPTIONS: readonly PlanResultOption[] = [
  {
    value: "plan",
    label: "予定",
  },
  {
    value: "actual",
    label: "実績",
  },
];
const PLAN_RESULT_BUTTON_CLASS_NAME = "relative z-10 flex h-7 min-h-0 min-w-6 items-center justify-center rounded-none px-1 appearance-none select-none text-sm font-semibold leading-none tracking-tight outline-none ring-0 transition-[color,transform] duration-150 ease-out hover:bg-transparent hover:text-[#2f343b] active:scale-[0.97] focus:outline-none focus:ring-0 focus-visible:bg-transparent focus-visible:text-[#2f343b] focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";

const togglePlanResultValue = (
  selectedValues: readonly PlanResultMode[],
  nextValue: PlanResultMode,
): PlanResultMode[] => {
  const nextValueSet = new Set(selectedValues);
  if (nextValueSet.has(nextValue)) {
    nextValueSet.delete(nextValue);
  } else {
    nextValueSet.add(nextValue);
  }
  return PLAN_RESULT_OPTIONS.map((option) => option.value).filter((optionValue) =>
    nextValueSet.has(optionValue),
  );
};

const TogglePlanResult = ({ value, onChange, className }: TogglePlanResultProps) => {
  return (
    <div
      role="group"
      aria-label="予定・実績"
      className={cn(
        "relative inline-grid h-7 w-max grid-flow-col items-center gap-2.5 rounded-none bg-transparent p-0",
        className,
      )}
    >
      {PLAN_RESULT_OPTIONS.map((option) => {
        const isActive = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(togglePlanResultValue(value, option.value))}
            className={cn(
              PLAN_RESULT_BUTTON_CLASS_NAME,
              isActive ? "text-[#2f343b]" : "text-[#c7c7c7]",
            )}
          >
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export { TogglePlanResult, TogglePlanResult as PlanResultDropdown };
export type { PlanResultMode };
