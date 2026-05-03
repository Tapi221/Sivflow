import type { PdfPageLayoutMode } from "@/types";
import { OverlayToolbar } from "@/components/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@/components/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@/components/overlay-toolbar/OverlayToolbarDivider";
import {
  PdfDoublePageGlyph,
  PdfFitWidthGlyph,
  PdfNextGlyph,
  PdfPrevGlyph,
  PdfSinglePageGlyph,
} from "@/components/overlay-toolbar/OverlayToolbarGlyphs";
import { OverlayToolbarIndexNavigator } from "@/components/overlay-toolbar/OverlayToolbarIndexNavigator";
import { OverlayToolbarZoomControl } from "@/components/overlay-toolbar/OverlayToolbarZoomControl";
import { cn } from "@/lib/utils";

type PdfFitMode = "width" | "manual";

type PdfOverlayToolbarProps = {
  currentPage: number;
  numPages: number;
  zoomPercent: number;
  minZoomPercent: number;
  maxZoomPercent: number;
  fitMode: PdfFitMode;
  pageLayoutMode: PdfPageLayoutMode;
  zoomStepPercent?: number;
  onCommitPage: (nextPage: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onFitWidth: () => void;
  onZoomPercentChange: (nextPercent: number) => void;
  onPageLayoutModeChange: (nextMode: PdfPageLayoutMode) => void;
  canGoToPrevPage: boolean;
  canGoToNextPage: boolean;
  disabled?: boolean;
};

export const PdfOverlayToolbar = ({
  currentPage,
  numPages,
  zoomPercent,
  minZoomPercent,
  maxZoomPercent,
  fitMode,
  pageLayoutMode,
  zoomStepPercent = 1,
  onCommitPage,
  onPrevPage,
  onNextPage,
  onFitWidth,
  onZoomPercentChange,
  onPageLayoutModeChange,
  canGoToPrevPage,
  canGoToNextPage,
  disabled = false,
}: PdfOverlayToolbarProps) => {
  const isFitWidthActive = fitMode === "width";
  const canTogglePageLayoutMode = numPages > 1;
  const nextPageLayoutMode: PdfPageLayoutMode =
    pageLayoutMode === "single" ? "double" : "single";
  const pageLayoutModeToggleLabel =
    pageLayoutMode === "single"
      ? "単一表示。タップで2枚表示に切り替え"
      : "2枚表示。タップで単一表示に切り替え";

  const toolbarClassName =
    "border-[rgba(212,214,221,0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(243,244,247,0.9)_100%)] shadow-[0_8px_22px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(215,219,228,0.68)]";
  const buttonClassName =
    "h-6 w-6 border-[rgba(210,214,223,0.96)] bg-[rgba(255,255,255,0.82)] text-[#6f7483] shadow-[inset_0_1px_0_rgba(255,255,255,0.94)] hover:bg-[rgba(246,247,250,0.98)] hover:text-[#4e5565] disabled:border-[rgba(228,231,237,0.94)] disabled:bg-[rgba(249,250,252,0.68)] disabled:text-[#b4b9c5] disabled:hover:bg-[rgba(249,250,252,0.68)] disabled:hover:text-[#b4b9c5]";
  const activeButtonClassName =
    "border-[rgba(189,195,210,0.98)] bg-[rgba(248,249,252,0.98)] text-[#434a59] shadow-[inset_0_0_0_1px_rgba(115,123,145,0.1)]";
  const dividerClassName = "bg-[rgba(199,204,214,0.92)]";
  const navigatorClassName = "text-[#676d7b]";
  const navigatorInputClassName =
    "border-[rgba(210,214,223,0.96)] bg-[rgba(255,255,255,0.84)] text-[#4b5261] focus:border-[rgba(164,171,190,0.96)] focus:bg-[rgba(250,251,253,0.98)]";
  const totalClassName = "text-[#5e6574]";
  const sliderTrackClassName = "bg-[rgba(213,216,224,0.9)]";
  const sliderRangeClassName =
    "bg-[linear-gradient(90deg,rgba(170,175,197,0.96)_0%,rgba(150,156,184,0.96)_100%)]";
  const sliderThumbClassName =
    "[&::-webkit-slider-thumb]:border-[rgba(198,203,214,0.94)] [&::-webkit-slider-thumb]:bg-[rgba(255,255,255,0.98)] [&::-webkit-slider-thumb]:shadow-[0_3px_8px_rgba(15,23,42,0.14)] [&::-moz-range-thumb]:border-[rgba(198,203,214,0.94)] [&::-moz-range-thumb]:bg-[rgba(255,255,255,0.98)] [&::-moz-range-thumb]:shadow-[0_3px_8px_rgba(15,23,42,0.14)]";

  return (
    <OverlayToolbar className={toolbarClassName}>
      <OverlayToolbarButton
        onClick={onPrevPage}
        label="前のページ"
        disabled={disabled || !canGoToPrevPage}
        className={buttonClassName}
      >
        <PdfPrevGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarButton
        onClick={onNextPage}
        label="次のページ"
        disabled={disabled || !canGoToNextPage}
        className={buttonClassName}
      >
        <PdfNextGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarDivider className={dividerClassName} />

      <OverlayToolbarIndexNavigator
        value={currentPage}
        total={numPages}
        onCommit={onCommitPage}
        inputAriaLabel="PDFページ番号"
        className={navigatorClassName}
        inputClassName={navigatorInputClassName}
        totalClassName={totalClassName}
      />

      <OverlayToolbarDivider className={dividerClassName} />

      <OverlayToolbarButton
        onClick={onFitWidth}
        label="幅に合わせる"
        disabled={disabled}
        active={isFitWidthActive}
        className={cn(
          buttonClassName,
          isFitWidthActive && activeButtonClassName,
        )}
      >
        <PdfFitWidthGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarDivider className={dividerClassName} />

      <OverlayToolbarButton
        onClick={() => {
          onPageLayoutModeChange(nextPageLayoutMode);
        }}
        label={pageLayoutModeToggleLabel}
        disabled={disabled || !canTogglePageLayoutMode}
        active={canTogglePageLayoutMode && pageLayoutMode === "double"}
        className={cn(
          buttonClassName,
          canTogglePageLayoutMode &&
            pageLayoutMode === "double" &&
            activeButtonClassName,
        )}
      >
        {pageLayoutMode === "single" ? (
          <PdfSinglePageGlyph />
        ) : (
          <PdfDoublePageGlyph />
        )}
      </OverlayToolbarButton>

      <OverlayToolbarDivider className={dividerClassName} />

      <OverlayToolbarZoomControl
        value={zoomPercent}
        min={minZoomPercent}
        max={maxZoomPercent}
        step={zoomStepPercent}
        onChange={onZoomPercentChange}
        label="PDFズーム"
        disabled={disabled}
        sliderWrapperClassName="w-14 px-0.5 sm:w-16"
        valueClassName={totalClassName}
        trackClassName={sliderTrackClassName}
        rangeClassName={sliderRangeClassName}
        thumbClassName={sliderThumbClassName}
      />
    </OverlayToolbar>
  );
};
