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
  const nextPageLayoutMode: PdfPageLayoutMode =
    pageLayoutMode === "single" ? "double" : "single";
  const pageLayoutToggleLabel =
    pageLayoutMode === "single"
      ? "単一表示。タップで2枚表示に切り替え"
      : "2枚表示。タップで単一表示に切り替え";
  const isPageLayoutToggleDisabled = disabled || numPages <= 1;

  return (
    <OverlayToolbar>
      <OverlayToolbarButton
        onClick={onPrevPage}
        label="前のページ"
        disabled={disabled || !canGoToPrevPage}
        className="h-6 w-6"
      >
        <PdfPrevGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarButton
        onClick={onNextPage}
        label="次のページ"
        disabled={disabled || !canGoToNextPage}
        className="h-6 w-6"
      >
        <PdfNextGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarDivider />

      <OverlayToolbarIndexNavigator
        value={currentPage}
        total={numPages}
        onCommit={onCommitPage}
        inputAriaLabel="PDFページ番号"
      />

      <OverlayToolbarDivider />

      <OverlayToolbarButton
        onClick={onFitWidth}
        label="幅に合わせる"
        disabled={disabled}
        active={isFitWidthActive}
        className="h-6 w-6"
      >
        <PdfFitWidthGlyph />
      </OverlayToolbarButton>

      <OverlayToolbarDivider />

      <OverlayToolbarButton
        onClick={() => {
          onPageLayoutModeChange(nextPageLayoutMode);
        }}
        label={pageLayoutToggleLabel}
        disabled={isPageLayoutToggleDisabled}
        active={pageLayoutMode === "double"}
        className="h-6 w-6"
      >
        {pageLayoutMode === "single" ? (
          <PdfSinglePageGlyph />
        ) : (
          <PdfDoublePageGlyph />
        )}
      </OverlayToolbarButton>

      <OverlayToolbarDivider />

      <OverlayToolbarZoomControl
        value={zoomPercent}
        min={minZoomPercent}
        max={maxZoomPercent}
        step={zoomStepPercent}
        onChange={onZoomPercentChange}
        label="PDFズーム"
        disabled={disabled}
        sliderWrapperClassName="w-14 px-0.5 sm:w-16"
      />
    </OverlayToolbar>
  );
};
