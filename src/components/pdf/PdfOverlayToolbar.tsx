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
    "border-[#E2E4E9] bg-[#FFFFFF] shadow-[0_8px_24px_rgba(37,39,45,0.08)]";
  const buttonClassName =
    "h-6 w-6 border-[#E2E4E9] bg-[#FFFFFF] text-[#74798B] shadow-none hover:bg-[#FFFFFF] hover:text-[#25272D] disabled:border-[#E2E4E9] disabled:bg-[#FFFFFF] disabled:text-[#E2E4E9] disabled:hover:bg-[#FFFFFF] disabled:hover:text-[#E2E4E9]";
  const activeButtonClassName =
    "border-[#E2E4E9] bg-[#FFFFFF] text-[#25272D] shadow-[inset_0_0_0_1px_#E2E4E9]";
  const dividerClassName = "bg-[#E2E4E9]";
  const navigatorClassName = "text-[#74798B]";
  const navigatorInputClassName =
    "border-[#E2E4E9] bg-[#FFFFFF] text-[#25272D] focus:border-[#74798B] focus:bg-[#FFFFFF]";
  const totalClassName = "text-[#74798B]";
  const sliderTrackClassName = "bg-[#E2E4E9]";
  const sliderRangeClassName = "bg-[#74798B]";
  const sliderThumbClassName =
    "[&::-webkit-slider-thumb]:border-[#E2E4E9] [&::-webkit-slider-thumb]:bg-[#FFFFFF] [&::-webkit-slider-thumb]:shadow-[0_3px_8px_rgba(37,39,45,0.14)] [&::-moz-range-thumb]:border-[#E2E4E9] [&::-moz-range-thumb]:bg-[#FFFFFF] [&::-moz-range-thumb]:shadow-[0_3px_8px_rgba(37,39,45,0.14)]";

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
