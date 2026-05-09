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
import {
  pdfOverlayToolbarButtonActiveClassName,
  pdfOverlayToolbarButtonClassName,
  pdfOverlayToolbarDividerClassName,
  pdfOverlayToolbarNavigatorClassName,
  pdfOverlayToolbarNavigatorInputClassName,
  pdfOverlayToolbarShellClassName,
  pdfOverlayToolbarSliderRangeClassName,
  pdfOverlayToolbarSliderThumbClassName,
  pdfOverlayToolbarSliderTrackClassName,
  pdfOverlayToolbarTotalClassName,
} from "./pdfToolbar.classname";

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

  return (
    <OverlayToolbar className={pdfOverlayToolbarShellClassName}>
      <OverlayToolbarButton
        onClick={onPrevPage}
        label="前のページ"
        disabled={disabled || !canGoToPrevPage}
        className={pdfOverlayToolbarButtonClassName}
      >
        <PdfPrevGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarButton
        onClick={onNextPage}
        label="次のページ"
        disabled={disabled || !canGoToNextPage}
        className={pdfOverlayToolbarButtonClassName}
      >
        <PdfNextGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarDivider className={pdfOverlayToolbarDividerClassName} />

      <OverlayToolbarIndexNavigator
        value={currentPage}
        total={numPages}
        onCommit={onCommitPage}
        inputAriaLabel="PDFページ番号"
        className={pdfOverlayToolbarNavigatorClassName}
        inputClassName={pdfOverlayToolbarNavigatorInputClassName}
        totalClassName={pdfOverlayToolbarTotalClassName}
      />

      <OverlayToolbarDivider className={pdfOverlayToolbarDividerClassName} />

      <OverlayToolbarButton
        onClick={onFitWidth}
        label="幅に合わせる"
        disabled={disabled}
        active={isFitWidthActive}
        className={cn(
          pdfOverlayToolbarButtonClassName,
          isFitWidthActive && pdfOverlayToolbarButtonActiveClassName,
        )}
      >
        <PdfFitWidthGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarButton
        onClick={() => {
          onPageLayoutModeChange(nextPageLayoutMode);
        }}
        label={pageLayoutModeToggleLabel}
        disabled={disabled || !canTogglePageLayoutMode}
        active={canTogglePageLayoutMode && pageLayoutMode === "double"}
        className={cn(
          pdfOverlayToolbarButtonClassName,
          canTogglePageLayoutMode &&
            pageLayoutMode === "double" &&
            pdfOverlayToolbarButtonActiveClassName,
        )}
      >
        {pageLayoutMode === "single" ? (
          <PdfSinglePageGlyph />
        ) : (
          <PdfDoublePageGlyph />
        )}
      </OverlayToolbarButton>

      <OverlayToolbarDivider className={pdfOverlayToolbarDividerClassName} />

      <OverlayToolbarZoomControl
        value={zoomPercent}
        min={minZoomPercent}
        max={maxZoomPercent}
        step={zoomStepPercent}
        onChange={onZoomPercentChange}
        label="PDFズーム"
        disabled={disabled}
        sliderWrapperClassName="w-16 px-0.5 sm:w-20"
        valueClassName={pdfOverlayToolbarTotalClassName}
        trackClassName={pdfOverlayToolbarSliderTrackClassName}
        rangeClassName={pdfOverlayToolbarSliderRangeClassName}
        thumbClassName={pdfOverlayToolbarSliderThumbClassName}
      />
    </OverlayToolbar>
  );
};
