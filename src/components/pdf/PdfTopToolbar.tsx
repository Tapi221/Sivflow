import { OverlayToolbar } from "@/components/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@/components/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@/components/overlay-toolbar/OverlayToolbarDivider";
import { OverlayToolbarIndexNavigator } from "@/components/overlay-toolbar/OverlayToolbarIndexNavigator";
import { OverlayToolbarZoomControl } from "@/components/overlay-toolbar/OverlayToolbarZoomControl";
import {
  PdfDoublePageGlyph,
  PdfFitWidthGlyph,
  PdfNextGlyph,
  PdfPrevGlyph,
  PdfSinglePageGlyph,
} from "@/components/overlay-toolbar/OverlayToolbarGlyphs";
import { usePdfWorkspace } from "@/components/pdf/usePdfWorkspace";
import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode } from "@/types";

type PdfTopToolbarProps = {
  className?: string;
};

export const PdfTopToolbar = ({ className }: PdfTopToolbarProps) => {
  const {
    alignedCurrentPage,
    numPages,
    zoomPercent,
    fitMode,
    pageLayoutMode,
    handleCommitPage,
    handlePrev,
    handleNext,
    handleFitWidth,
    handleZoomPercentChange,
    handlePageLayoutModeChange,
    canGoToPrevPage,
    canGoToNextPage,
  } = usePdfWorkspace();

  const nextPageLayoutMode: PdfPageLayoutMode =
    pageLayoutMode === "single" ? "double" : "single";

  const isFitWidthActive = fitMode === "width";
  const canTogglePageLayoutMode = numPages > 1;
  const isDoublePageMode = pageLayoutMode === "double";

  return (
    <div
      className={cn(
        "border-b border-slate-200/70 bg-white/80 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/65",
        className,
      )}
    >
      <OverlayToolbar className="w-full justify-between gap-2 overflow-x-auto rounded-2xl px-2.5 py-1.5">
        <div className="flex min-w-max items-center gap-1.5">
          <OverlayToolbarButton
            onClick={handlePrev}
            label="前のページ"
            disabled={!canGoToPrevPage}
          >
            <PdfPrevGlyph />
          </OverlayToolbarButton>

          <OverlayToolbarButton
            onClick={handleNext}
            label="次のページ"
            disabled={!canGoToNextPage}
          >
            <PdfNextGlyph />
          </OverlayToolbarButton>

          <OverlayToolbarDivider />

          <OverlayToolbarIndexNavigator
            value={alignedCurrentPage}
            total={numPages}
            onCommit={handleCommitPage}
            inputAriaLabel="PDFページ番号"
            className="shrink-0"
          />
        </div>

        <div className="flex min-w-max items-center gap-1.5">
          <OverlayToolbarButton
            onClick={handleFitWidth}
            label="幅に合わせる"
            active={isFitWidthActive}
          >
            <PdfFitWidthGlyph />
          </OverlayToolbarButton>

          <OverlayToolbarButton
            onClick={() => {
              handlePageLayoutModeChange(nextPageLayoutMode);
            }}
            label={
              isDoublePageMode
                ? "単一表示に切り替え"
                : "2枚表示に切り替え"
            }
            disabled={!canTogglePageLayoutMode}
            active={isDoublePageMode}
          >
            {isDoublePageMode ? <PdfDoublePageGlyph /> : <PdfSinglePageGlyph />}
          </OverlayToolbarButton>

          <OverlayToolbarDivider />

          <OverlayToolbarZoomControl
            value={zoomPercent}
            min={0}
            max={100}
            step={1}
            onChange={handleZoomPercentChange}
            label="PDFズーム"
            sliderWrapperClassName="w-20 px-0.5 sm:w-24"
            valueClassName="min-w-[2.75rem]"
          />
        </div>
      </OverlayToolbar>
    </div>
  );
};
