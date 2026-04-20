import React from "react";

import {
  CARD_LAYOUT_MODE_LABELS,
  type CardLayoutMode,
} from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT } from "@constants/shared/flashcard";
import { OverlayToolbar } from "@/components/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@/components/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@/components/overlay-toolbar/OverlayToolbarDivider";
import { OverlayToolbarIndexNavigator } from "@/components/overlay-toolbar/OverlayToolbarIndexNavigator";
import { OverlayToolbarZoomControl } from "@/components/overlay-toolbar/OverlayToolbarZoomControl";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import {
  FixedDisplayGlyph,
  FlipGlyph,
  FluidDisplayGlyph,
  SplitGlyph,
  StackGlyph,
} from "./cardViewToolbarGlyphs";

type ZoomControlProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (nextValue: number) => void;
};

type CardIndexNavigatorProps = {
  current: number;
  total: number;
  onCommit: (nextOneBasedIndex: number) => void;
};

type CardViewCompactToolbarProps = {
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  disabledCardLayoutModes?: Partial<Record<CardLayoutMode, boolean>>;
  onChangeDisplayMode: (mode: CardDisplayMode) => void;
  onChangeCardLayoutMode: (mode: CardLayoutMode) => void;
  zoom?: ZoomControlProps | null;
  indexNavigator?: CardIndexNavigatorProps | null;
};

type ModeButtonProps = {
  isActive: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
};

const ModeButton = ({
  isActive,
  onClick,
  label,
  disabled = false,
  children,
}: ModeButtonProps) => {
  return (
    <OverlayToolbarButton
      onClick={onClick}
      label={label}
      disabled={disabled}
      active={isActive}
      className="h-6 w-6"
    >
      {children}
    </OverlayToolbarButton>
  );
};

export const CardViewCompactToolbar = ({
  displayMode,
  cardLayoutMode,
  disabledCardLayoutModes,
  onChangeDisplayMode,
  onChangeCardLayoutMode,
  zoom = null,
  indexNavigator = null,
}: CardViewCompactToolbarProps) => {
  const nextDisplayMode: CardDisplayMode =
    displayMode === "fixed" ? "fluid" : "fixed";

  const displayModeToggleLabel =
    displayMode === "fixed"
      ? "カード表示。タップで最大表示に切り替え"
      : "最大表示。タップでカード表示に切り替え";

  const resolvedStep = React.useMemo(() => {
    if (!zoom?.step || !Number.isFinite(zoom.step) || zoom.step <= 0) {
      return CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT;
    }

    return zoom.step;
  }, [zoom?.step]);

  return (
    <OverlayToolbar className="gap-1.5 px-2 py-1">
      <ModeButton
        isActive={displayMode === "fluid"}
        onClick={() => onChangeDisplayMode(nextDisplayMode)}
        label={displayModeToggleLabel}
      >
        {displayMode === "fixed" ? (
          <FixedDisplayGlyph />
        ) : (
          <FluidDisplayGlyph />
        )}
      </ModeButton>

      <div className="flex items-center gap-1">
        <ModeButton
          isActive={cardLayoutMode === "stack"}
          onClick={() => onChangeCardLayoutMode("stack")}
          label={CARD_LAYOUT_MODE_LABELS.stack}
          disabled={disabledCardLayoutModes?.stack}
        >
          <StackGlyph />
        </ModeButton>
        <ModeButton
          isActive={cardLayoutMode === "flip"}
          onClick={() => onChangeCardLayoutMode("flip")}
          label={CARD_LAYOUT_MODE_LABELS.flip}
          disabled={disabledCardLayoutModes?.flip}
        >
          <FlipGlyph />
        </ModeButton>
        <ModeButton
          isActive={cardLayoutMode === "split"}
          onClick={() => onChangeCardLayoutMode("split")}
          label={CARD_LAYOUT_MODE_LABELS.split}
          disabled={disabledCardLayoutModes?.split}
        >
          <SplitGlyph />
        </ModeButton>
      </div>

      {indexNavigator ? (
        <>
          <OverlayToolbarDivider />

          <OverlayToolbarIndexNavigator
            value={indexNavigator.current}
            total={indexNavigator.total}
            onCommit={indexNavigator.onCommit}
            inputAriaLabel="カード番号"
          />
        </>
      ) : null}

      {zoom ? (
        <>
          <OverlayToolbarDivider />

          <OverlayToolbarZoomControl
            value={zoom.value}
            min={zoom.min}
            max={zoom.max}
            step={resolvedStep}
            onChange={zoom.onChange}
            label="カードズーム"
            sliderWrapperClassName="w-14 px-0.5 sm:w-16"
          />
        </>
      ) : null}
    </OverlayToolbar>
  );
};
