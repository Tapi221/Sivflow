import { OverlayToolbar } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarDivider";
import { FixedDisplayGlyph, FlipGlyph, FluidDisplayGlyph, SplitGlyph, StackGlyph } from "@web-renderer/chip/panel/overlay-toolbar/OverlayToolbarGlyphs";
import type { ReactNode } from "react";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_LAYOUT_MODE_LABELS } from "@/features/cardsetview/domain/cardLayoutMode";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type CardModeToolbarProps = {
  displayMode: CardDisplayMode;
  cardLayoutMode: CardLayoutMode;
  disabledCardLayoutModes?: Partial<Record<CardLayoutMode, boolean>>;
  onChangeDisplayMode: (mode: CardDisplayMode) => void;
  onChangeCardLayoutMode: (mode: CardLayoutMode) => void;
};
type ModeButtonProps = {
  isActive: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
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
      className="h-7 w-7"
    >
      {children}
    </OverlayToolbarButton>
  );
};
const CardModeToolbar = ({ displayMode, cardLayoutMode, disabledCardLayoutModes, onChangeDisplayMode, onChangeCardLayoutMode }: CardModeToolbarProps) => {
  const nextDisplayMode: CardDisplayMode = displayMode === "fixed" ? "fluid" : "fixed";
  const displayModeToggleLabel =
    displayMode === "fixed"
      ? "カード表示。タップで最大表示に切り替え"
      : "最大表示。タップでカード表示に切り替え";

  return (
    <OverlayToolbar className="gap-2 px-2.5">
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
      <OverlayToolbarDivider className="h-5 bg-[rgba(218,207,197,0.92)]" />
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
    </OverlayToolbar>
  );
};



export { CardModeToolbar };
