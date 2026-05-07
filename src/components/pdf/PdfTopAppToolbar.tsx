import type { ReactNode } from "react";

import { OverlayToolbarIndexNavigator } from "@/components/overlay-toolbar/OverlayToolbarIndexNavigator";
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

type PdfTopAppToolbarProps = {
  className?: string;
};

type PdfTopAppToolbarButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: ReactNode;
  className?: string;
};

const toolbarButtonBaseClassName =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-slate-700 transition-colors";
const toolbarButtonEnabledClassName =
  "border-slate-200 bg-white hover:bg-slate-50";
const toolbarButtonActiveClassName =
  "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50";
const toolbarButtonDisabledClassName =
  "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400";

const clampZoomPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

const PdfTopAppToolbarButton = ({
  onClick,
  disabled = false,
  active = false,
  title,
  children,
  className,
}: PdfTopAppToolbarButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-pressed={active}
      title={title}
      className={cn(
        toolbarButtonBaseClassName,
        disabled
          ? toolbarButtonDisabledClassName
          : active
            ? toolbarButtonActiveClassName
            : toolbarButtonEnabledClassName,
        className,
      )}
    >
      {children}
    </button>
  );
};

const PdfTopAppToolbarDivider = () => {
  return <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />;
};

export const PdfTopAppToolbar = ({ className }: PdfTopAppToolbarProps) => {
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
  const isDoublePageMode = pageLayoutMode === "double";
  const canTogglePageLayoutMode = numPages > 1;

  const handleZoomOut = () => {
    handleZoomPercentChange(clampZoomPercent(zoomPercent - 10));
  };

  const handleZoomIn = () => {
    handleZoomPercentChange(clampZoomPercent(zoomPercent + 10));
  };

  return (
    <div
      className={cn(
        "flex h-14 w-full items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3",
        className,
      )}
    >
      <div className="flex min-w-max items-center gap-2">
        <PdfTopAppToolbarButton
          onClick={handlePrev}
          disabled={!canGoToPrevPage}
          title="前のページ"
          className="w-10 px-0"
        >
          <PdfPrevGlyph />
        </PdfTopAppToolbarButton>

        <PdfTopAppToolbarButton
          onClick={handleNext}
          disabled={!canGoToNextPage}
          title="次のページ"
          className="w-10 px-0"
        >
          <PdfNextGlyph />
        </PdfTopAppToolbarButton>
      </div>

      <PdfTopAppToolbarDivider />

      <div className="flex min-w-max items-center gap-2">
        <OverlayToolbarIndexNavigator
          value={alignedCurrentPage}
          total={numPages}
          onCommit={handleCommitPage}
          inputAriaLabel="PDFページ番号"
          className="gap-2 text-xs text-slate-600"
          inputClassName="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 shadow-none sm:w-16"
          totalClassName="text-xs text-slate-500"
        />

        <PdfTopAppToolbarButton
          onClick={handleZoomOut}
          title="縮小"
          className="w-10 px-0 text-base"
        >
          <span aria-hidden="true">−</span>
        </PdfTopAppToolbarButton>

        <div className="inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
          {zoomPercent}%
        </div>

        <PdfTopAppToolbarButton
          onClick={handleZoomIn}
          title="拡大"
          className="w-10 px-0 text-base"
        >
          <span aria-hidden="true">＋</span>
        </PdfTopAppToolbarButton>
      </div>

      <div className="ml-auto flex min-w-max items-center gap-2">
        <PdfTopAppToolbarButton
          onClick={handleFitWidth}
          active={isFitWidthActive}
          title="幅に合わせる"
        >
          <PdfFitWidthGlyph />
          <span>幅に合わせる</span>
        </PdfTopAppToolbarButton>

        <PdfTopAppToolbarButton
          onClick={() => {
            handlePageLayoutModeChange("single");
          }}
          active={!isDoublePageMode}
          title="1ページ表示"
        >
          <PdfSinglePageGlyph />
          <span>1ページ</span>
        </PdfTopAppToolbarButton>

        <PdfTopAppToolbarButton
          onClick={() => {
            handlePageLayoutModeChange(nextPageLayoutMode);
          }}
          disabled={!canTogglePageLayoutMode}
          active={isDoublePageMode}
          title="2ページ表示"
        >
          <PdfDoublePageGlyph />
          <span>2ページ</span>
        </PdfTopAppToolbarButton>
      </div>
    </div>
  );
};
