import { OverlayToolbar } from "@/chip/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@/chip/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@/chip/overlay-toolbar/OverlayToolbarDivider";
import { PdfDoublePageGlyph, PdfFitWidthGlyph, PdfNextGlyph, PdfPrevGlyph, PdfSinglePageGlyph, SelectionCaptureGlyph } from "@/chip/overlay-toolbar/OverlayToolbarGlyphs";
import { OverlayToolbarIndexNavigator } from "@/chip/overlay-toolbar/OverlayToolbarIndexNavigator";
import { OverlayToolbarZoomControl } from "@/chip/overlay-toolbar/OverlayToolbarZoomControl";
import { pdfOverlayToolbarButtonActiveClassName, pdfOverlayToolbarButtonClassName, pdfOverlayToolbarDividerClassName, pdfOverlayToolbarNavigatorClassName, pdfOverlayToolbarNavigatorInputClassName, pdfOverlayToolbarShellClassName, pdfOverlayToolbarSliderRangeClassName, pdfOverlayToolbarSliderThumbClassName, pdfOverlayToolbarSliderTrackClassName, pdfOverlayToolbarTotalClassName } from "./pdfToolbar.classname";
import type { CardSelectionCaptureSide } from "@/features/selection-capture/cardSelectionCaptureEvents";
import type { SelectionCaptureShape } from "@/features/selection-capture/selectionCapture.types";
import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode } from "@/types";

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
  selectionCaptureActive?: boolean;
  selectionCaptureDisabled?: boolean;
  selectionCaptureSide?: CardSelectionCaptureSide;
  selectionCaptureShape?: SelectionCaptureShape;
  onSelectionCaptureSideChange?: (side: CardSelectionCaptureSide) => void;
  onSelectionCaptureShapeChange?: (shape: SelectionCaptureShape) => void;
  onSelectionCaptureToggle?: () => void;
  disabled?: boolean;
};

const captureSideButtonClassName = "h-7 min-w-7 px-2 text-[11px] font-semibold leading-none";
const captureShapeButtonClassName = "h-7 min-w-7 px-2 text-[11px] font-semibold leading-none";

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
  selectionCaptureActive = false,
  selectionCaptureDisabled = false,
  selectionCaptureSide = "question",
  selectionCaptureShape = "rectangle",
  onSelectionCaptureSideChange,
  onSelectionCaptureShapeChange,
  onSelectionCaptureToggle,
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
  const shouldRenderSelectionCaptureControl = Boolean(onSelectionCaptureToggle);
  const shouldRenderSelectionCaptureSideControl = Boolean(onSelectionCaptureSideChange);
  const shouldRenderSelectionCaptureShapeControl = Boolean(onSelectionCaptureShapeChange);

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

      {shouldRenderSelectionCaptureControl ? (
        <>
          <OverlayToolbarDivider className={pdfOverlayToolbarDividerClassName} />

          {shouldRenderSelectionCaptureSideControl ? (
            <>
              <OverlayToolbarButton
                onClick={() => {
                  onSelectionCaptureSideChange?.("question");
                }}
                label="PDF範囲の追加先: 問題"
                disabled={disabled || selectionCaptureDisabled}
                active={selectionCaptureSide === "question"}
                className={cn(
                  pdfOverlayToolbarButtonClassName,
                  captureSideButtonClassName,
                  selectionCaptureSide === "question" && pdfOverlayToolbarButtonActiveClassName,
                )}
              >
                Q
              </OverlayToolbarButton>

              <OverlayToolbarButton
                onClick={() => {
                  onSelectionCaptureSideChange?.("answer");
                }}
                label="PDF範囲の追加先: 答え"
                disabled={disabled || selectionCaptureDisabled}
                active={selectionCaptureSide === "answer"}
                className={cn(
                  pdfOverlayToolbarButtonClassName,
                  captureSideButtonClassName,
                  selectionCaptureSide === "answer" && pdfOverlayToolbarButtonActiveClassName,
                )}
              >
                A
              </OverlayToolbarButton>
            </>
          ) : null}

          {shouldRenderSelectionCaptureShapeControl ? (
            <>
              <OverlayToolbarButton
                onClick={() => {
                  onSelectionCaptureShapeChange?.("rectangle");
                }}
                label="PDF範囲の形: 矩形"
                disabled={disabled || selectionCaptureDisabled}
                active={selectionCaptureShape === "rectangle"}
                className={cn(
                  pdfOverlayToolbarButtonClassName,
                  captureShapeButtonClassName,
                  selectionCaptureShape === "rectangle" && pdfOverlayToolbarButtonActiveClassName,
                )}
              >
                □
              </OverlayToolbarButton>

              <OverlayToolbarButton
                onClick={() => {
                  onSelectionCaptureShapeChange?.("freehand");
                }}
                label="PDF範囲の形: 自由形"
                disabled={disabled || selectionCaptureDisabled}
                active={selectionCaptureShape === "freehand"}
                className={cn(
                  pdfOverlayToolbarButtonClassName,
                  captureShapeButtonClassName,
                  selectionCaptureShape === "freehand" && pdfOverlayToolbarButtonActiveClassName,
                )}
              >
                ✎
              </OverlayToolbarButton>
            </>
          ) : null}

          <OverlayToolbarButton
            onClick={() => {
              onSelectionCaptureToggle?.();
            }}
            label={selectionCaptureActive ? "PDF範囲追加をキャンセル" : "PDF範囲をカードへ追加"}
            disabled={disabled || selectionCaptureDisabled}
            active={selectionCaptureActive}
            className={cn(
              pdfOverlayToolbarButtonClassName,
              selectionCaptureActive && pdfOverlayToolbarButtonActiveClassName,
            )}
          >
            <SelectionCaptureGlyph />
          </OverlayToolbarButton>
        </>
      ) : null}

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
