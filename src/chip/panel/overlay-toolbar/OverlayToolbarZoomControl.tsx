import React from "react";
import { ScrollBar } from "@/chip/bar/ScrollBar";
import { Minus, Plus } from "@/chip/icons";
import { OverlayToolbarButton } from "@/chip/panel/overlay-toolbar/OverlayToolbarButton";
import { cn } from "@/lib/utils";

type OverlayToolbarZoomControlBaseProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (nextValue: number) => void;
  label: string;
  disabled?: boolean;
  sliderWrapperClassName?: string;
  valueClassName?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  formatValue?: (value: number) => string;
};
type OverlayToolbarZoomControlWithoutStepButtonsProps =
  OverlayToolbarZoomControlBaseProps & {
    showStepButtons?: false;
  };
type OverlayToolbarZoomControlWithStepButtonsProps =
  OverlayToolbarZoomControlBaseProps & {
    showStepButtons: true;
    onStepDown: () => void;
    onStepUp: () => void;
    decreaseLabel: string;
    increaseLabel: string;
  };
type OverlayToolbarZoomControlProps = | OverlayToolbarZoomControlWithoutStepButtonsProps | OverlayToolbarZoomControlWithStepButtonsProps;

const DEFAULT_FORMAT_VALUE = (value: number) => `${Math.round(value)}%`;

const OverlayToolbarZoomControl = (props: OverlayToolbarZoomControlProps) => {
  const { value, min, max, step, onChange, label, disabled = false, sliderWrapperClassName, valueClassName, trackClassName, rangeClassName, thumbClassName, formatValue = DEFAULT_FORMAT_VALUE } = props;

  const sliderValue = React.useMemo<readonly [number]>(
    () => [value] as const,
    [value],
  );

  const resolvedStep = React.useMemo(() => {
    if (!Number.isFinite(step) || (step === null || step === undefined) || step <= 0) {
      return 1;
    }

    return step;
  }, [step]);

  const handleSliderChange = React.useCallback(
    (next: number[]) => {
      const nextValue = next[0];
      if (typeof nextValue === "number" && Number.isFinite(nextValue)) {
        onChange(nextValue);
      }
    },
    [onChange],
  );

  return (
    <>
      {props.showStepButtons ? (
        <OverlayToolbarButton
          onClick={props.onStepDown}
          label={props.decreaseLabel}
          disabled={disabled || value <= min}
          className="h-7 w-7"
        >
          <Minus className="h-3.5 w-3.5" />
        </OverlayToolbarButton>
      ) : null}

      <ScrollBar
        value={sliderValue}
        min={min}
        max={max}
        step={resolvedStep}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderChange}
        ariaLabel={label}
        disabled={disabled}
        className={sliderWrapperClassName}
        trackClassName={trackClassName}
        rangeClassName={rangeClassName}
        thumbClassName={thumbClassName}
      />
      <div
        className={cn(
          "min-w-9 text-center text-xs font-semibold tabular-nums text-[#74798B]",
          valueClassName,
        )}
      >
        {formatValue(value)}
      </div>

      {props.showStepButtons ? (
        <OverlayToolbarButton
          onClick={props.onStepUp}
          label={props.increaseLabel}
          disabled={disabled || value >= max}
          className="h-7 w-7"
        >
          <Plus className="h-3.5 w-3.5" />
        </OverlayToolbarButton>
      ) : null}
    </>
  );
};

export { OverlayToolbarZoomControl };
export type { OverlayToolbarZoomControlProps };
