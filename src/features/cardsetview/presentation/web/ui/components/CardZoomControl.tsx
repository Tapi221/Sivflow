import { CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT } from "@constants/shared/flashcard";
import { OverlayToolbar } from "@/components/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarZoomControl } from "@/components/overlay-toolbar/OverlayToolbarZoomControl";

interface CardZoomControlProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (nextValue: number) => void;
  onStepDown: () => void;
  onStepUp: () => void;
}

export const CardZoomControl = ({
  value,
  min,
  max,
  step = CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT,
  onChange,
  onStepDown,
  onStepUp,
}: CardZoomControlProps) => {
  return (
    <OverlayToolbar>
      <OverlayToolbarZoomControl
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        label="カードズーム"
        showStepButtons
        onStepDown={onStepDown}
        onStepUp={onStepUp}
        decreaseLabel="ズームを縮小"
        increaseLabel="ズームを拡大"
        sliderWrapperClassName="w-24 px-0.5"
        valueClassName="min-w-[3.25rem] text-center text-[11px] font-semibold tabular-nums text-[#6b5f55]"
      />
    </OverlayToolbar>
  );
};
