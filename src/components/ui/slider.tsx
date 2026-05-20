import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value?: readonly number[];
  defaultValue?: readonly number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
};

const toSingleValue = (
  source: readonly number[] | undefined,
  fallback: number,
) => {
  if (!Array.isArray(source) || source.length === 0) {
    return fallback;
  }

  const candidate = source[0];
  return Number.isFinite(candidate) ? candidate : fallback;
};

const toNumber = (value: number | string | undefined, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const clampValue = (value: number, min: number, max: number) => {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  if (!Number.isFinite(value)) {
    return safeMin;
  }

  return Math.min(safeMax, Math.max(safeMin, value));
};

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      trackClassName,
      rangeClassName,
      thumbClassName,
      value,
      defaultValue,
      min,
      max,
      step,
      disabled,
      onValueChange,
      onValueCommit,
      onBlur,
      onMouseUp,
      onTouchEnd,
      onKeyUp,
      ...rest
    },
    ref,
  ) => {
    const resolvedMin = React.useMemo(() => toNumber(min, 0), [min]);
    const resolvedMax = React.useMemo(() => toNumber(max, 100), [max]);
    const resolvedStep = React.useMemo(() => toNumber(step, 1), [step]);

    const [internalValue, setInternalValue] = React.useState(() =>
      clampValue(
        toSingleValue(defaultValue, resolvedMin),
        resolvedMin,
        resolvedMax,
      ),
    );

    const isControlled = Array.isArray(value);

    React.useEffect(() => {
      if (!isControlled) {
        return;
      }

      setInternalValue((prev) => {
        const next = clampValue(
          toSingleValue(value, prev),
          resolvedMin,
          resolvedMax,
        );
        return next === prev ? prev : next;
      });
    }, [isControlled, resolvedMax, resolvedMin, value]);

    const currentValue = isControlled
      ? clampValue(
        toSingleValue(value, internalValue),
        resolvedMin,
        resolvedMax,
      )
      : clampValue(internalValue, resolvedMin, resolvedMax);

    const rangeRatio =
      resolvedMax === resolvedMin
        ? 0
        : ((currentValue - resolvedMin) / (resolvedMax - resolvedMin)) * 100;

    const emitChange = React.useCallback(
      (nextValue: number) => {
        const clamped = clampValue(nextValue, resolvedMin, resolvedMax);

        if (!isControlled) {
          setInternalValue((prev) => (prev === clamped ? prev : clamped));
        }

        onValueChange?.([clamped]);
      },
      [isControlled, onValueChange, resolvedMax, resolvedMin],
    );

    const emitCommit = React.useCallback(
      (nextValue: number) => {
        const clamped = clampValue(nextValue, resolvedMin, resolvedMax);
        onValueCommit?.([clamped]);
      },
      [onValueCommit, resolvedMax, resolvedMin],
    );

    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        emitChange(Number(event.currentTarget.value));
      },
      [emitChange],
    );

    const handleCommit = React.useCallback(
      (event: React.SyntheticEvent<HTMLInputElement>) => {
        emitCommit(Number(event.currentTarget.value));
      },
      [emitCommit],
    );

    return (
      <div
        className={cn(
          "relative flex w-full items-center select-none",
          disabled && "opacity-50",
          className,
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/20",
            trackClassName,
          )}
        >
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-[width] duration-75",
              rangeClassName,
            )}
            style={{ width: `${rangeRatio}%` }}
          />
        </div>

        <input
          {...rest}
          ref={ref}
          type="range"
          min={resolvedMin}
          max={resolvedMax}
          step={resolvedStep}
          disabled={disabled}
          value={currentValue}
          onChange={handleChange}
          onBlur={(event) => {
            handleCommit(event);
            onBlur?.(event);
          }}
          onMouseUp={(event) => {
            handleCommit(event);
            onMouseUp?.(event);
          }}
          onTouchEnd={(event) => {
            handleCommit(event);
            onTouchEnd?.(event);
          }}
          onKeyUp={(event) => {
            const commitKeys = new Set([
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ]);

            if (commitKeys.has(event.key)) {
              handleCommit(event);
            }

            onKeyUp?.(event);
          }}
          className={cn(
            "relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/50 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow",
            "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary/50 [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow",
            thumbClassName,
          )}
        />
      </div>
    );
  },
);

Slider.displayName = "Slider";

export { Slider };
