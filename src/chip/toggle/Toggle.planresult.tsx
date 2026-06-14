import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
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



const PLAN_RESULT_INDICATOR_ID = "plan-result-indicator";
const PLAN_RESULT_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
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
        "relative inline-grid h-6 w-max grid-flow-col items-center gap-1 rounded-lg bg-neutral-100 p-0.5",
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
              "relative z-10 flex h-5 min-h-0 min-w-6 items-center justify-center rounded-md px-1.5",
              "appearance-none select-none text-xs font-semibold leading-none tracking-tight",
              "outline-none ring-0 transition-colors duration-300 ease-out motion-reduce:transition-none",
              "focus:outline-none focus:ring-0 focus-visible:outline-none",
              isActive ? "text-neutral-500" : "text-neutral-400 hover:text-neutral-500",
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`${PLAN_RESULT_INDICATOR_ID}-${option.value}`}
                className="absolute inset-0 -z-10 rounded-md border border-neutral-200 bg-white shadow-none"
                transition={PLAN_RESULT_MOTION_TRANSITION}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};



export { TogglePlanResult, TogglePlanResult as PlanResultDropdown };


export type { PlanResultMode };
