import React from "react";
import { Edit } from "@web-renderer/chip/icons";
import { OverlayToolbar } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarDivider";
import { FixedDisplayGlyph, FlipGlyph, FluidDisplayGlyph, SplitGlyph, StackGlyph } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarGlyphs";
import { OverlayToolbarIndexNavigator } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarIndexNavigator";
import { OverlayToolbarZoomControl } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarZoomControl";
import { cn } from "@web-renderer/lib/utils";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_LAYOUT_MODE_LABELS } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT } from "@/features/cardsetview/domain/cardSetView.constants";
import type { CardDisplayMode } from "@/types/domain/cardSet";



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
  isEditing?: boolean;
  disabledCardLayoutModes?: Partial<Record<CardLayoutMode, boolean>>;
  onChangeDisplayMode: (mode: CardDisplayMode) => void;
  onChangeCardLayoutMode: (mode: CardLayoutMode) => void;
  onToggleEditing?: () => void;
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



const CARD_VIEW_COMPACT_TOOLBAR_CLASS_NAME = "gap-1.5 rounded-2xl border border-[#e6e4e1] bg-[#f7f7f6] px-1.5 py-1 text-[#85827e] shadow-none backdrop-blur-0";
const CARD_VIEW_COMPACT_MODE_BUTTON_CLASS_NAME = "h-7 w-7 border-0 bg-transparent text-[#85827e] shadow-none transition-colors hover:bg-slate-100 hover:text-[#2f343b] disabled:bg-transparent disabled:text-[#b7b7b7] disabled:opacity-50";
const CARD_VIEW_COMPACT_MODE_BUTTON_ACTIVE_CLASS_NAME = "bg-slate-100 text-[#2f343b]";
const CARD_VIEW_COMPACT_DIVIDER_CLASS_NAME = "bg-[#dedbd7]";
const CARD_VIEW_COMPACT_INDEX_CLASS_NAME = "text-[#85827e]";
const CARD_VIEW_COMPACT_INDEX_INPUT_CLASS_NAME = "h-7 rounded-md border-0 bg-transparent text-[#2f343b] shadow-none hover:bg-slate-100 focus:border-transparent focus:bg-slate-100";
const CARD_VIEW_COMPACT_INDEX_TOTAL_CLASS_NAME = "text-[#85827e]";
const CARD_VIEW_COMPACT_ZOOM_SLIDER_WRAPPER_CLASS_NAME = "w-16 px-1 sm:w-16";
const CARD_VIEW_COMPACT_ZOOM_TRACK_CLASS_NAME = "bg-[#dedbd7]";
const CARD_VIEW_COMPACT_ZOOM_RANGE_CLASS_NAME = "bg-[#8c8c8c]";
const CARD_VIEW_COMPACT_ZOOM_THUMB_CLASS_NAME = "[&::-webkit-slider-thumb]:border-[#c7c2bc] [&::-webkit-slider-thumb]:bg-[#f7f7f6] [&::-webkit-slider-thumb]:shadow-none [&::-moz-range-thumb]:border-[#c7c2bc] [&::-moz-range-thumb]:bg-[#f7f7f6] [&::-moz-range-thumb]:shadow-none";
const CARD_VIEW_COMPACT_ZOOM_VALUE_CLASS_NAME = "text-[#85827e]";



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
      className={cn(
        CARD_VIEW_COMPACT_MODE_BUTTON_CLASS_NAME,
        isActive && !disabled && CARD_VIEW_COMPACT_MODE_BUTTON_ACTIVE_CLASS_NAME,
      )}
    >
      {children}
    </OverlayToolbarButton>
  );
};
const CardViewCompactToolbar = ({
  displayMode,
  cardLayoutMode,
  isEditing = false,
  disabledCardLayoutModes,
  onChangeDisplayMode,
  onChangeCardLayoutMode,
  onToggleEditing,
  zoom = null,
  indexNavigator = null,
}: CardViewCompactToolbarProps) => {
  const nextDisplayMode: CardDisplayMode =
    displayMode === "fixed" ? "fluid" : "fixed";

  const displayModeToggleLabel =
    displayMode === "fixed"
      ? "カード表示。タップで最大表示に切り替え"
      : "最大表示。タップでカード表示に切り替え";

  const editingToggleLabel = isEditing
    ? "編集モード。タップで閲覧モードに切り替え"
    : "閲覧モード。タップで編集モードに切り替え";

  const resolvedStep = React.useMemo(() => {
    if (!zoom?.step || !Number.isFinite(zoom.step) || zoom.step <= 0) {
      return CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT;
    }

    return zoom.step;
  }, [zoom?.step]);

  return (
    <OverlayToolbar className={CARD_VIEW_COMPACT_TOOLBAR_CLASS_NAME}>
      {onToggleEditing ? (
        <>
          <ModeButton
            isActive={isEditing}
            onClick={onToggleEditing}
            label={editingToggleLabel}
          >
            <Edit size={14} />
          </ModeButton>
          <OverlayToolbarDivider className={CARD_VIEW_COMPACT_DIVIDER_CLASS_NAME} />
        </>
      ) : null}

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
          <OverlayToolbarDivider className={CARD_VIEW_COMPACT_DIVIDER_CLASS_NAME} />
          <OverlayToolbarIndexNavigator
            value={indexNavigator.current}
            total={indexNavigator.total}
            onCommit={indexNavigator.onCommit}
            inputAriaLabel="カード番号"
            className={CARD_VIEW_COMPACT_INDEX_CLASS_NAME}
            inputClassName={CARD_VIEW_COMPACT_INDEX_INPUT_CLASS_NAME}
            totalClassName={CARD_VIEW_COMPACT_INDEX_TOTAL_CLASS_NAME}
          />
        </>
      ) : null}

      {zoom ? (
        <>
          <OverlayToolbarDivider className={CARD_VIEW_COMPACT_DIVIDER_CLASS_NAME} />
          <OverlayToolbarZoomControl
            value={zoom.value}
            min={zoom.min}
            max={zoom.max}
            step={resolvedStep}
            onChange={zoom.onChange}
            label="カードズーム"
            sliderWrapperClassName={CARD_VIEW_COMPACT_ZOOM_SLIDER_WRAPPER_CLASS_NAME}
            trackClassName={CARD_VIEW_COMPACT_ZOOM_TRACK_CLASS_NAME}
            rangeClassName={CARD_VIEW_COMPACT_ZOOM_RANGE_CLASS_NAME}
            thumbClassName={CARD_VIEW_COMPACT_ZOOM_THUMB_CLASS_NAME}
            valueClassName={CARD_VIEW_COMPACT_ZOOM_VALUE_CLASS_NAME}
          />
        </>
      ) : null}
    </OverlayToolbar>
  );
};



export { CardViewCompactToolbar };
