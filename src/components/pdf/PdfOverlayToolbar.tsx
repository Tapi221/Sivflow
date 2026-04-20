import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { OverlayToolbar } from "@/components/overlay-toolbar/OverlayToolbar";
import { OverlayToolbarButton } from "@/components/overlay-toolbar/OverlayToolbarButton";
import { OverlayToolbarDivider } from "@/components/overlay-toolbar/OverlayToolbarDivider";
import { OverlayToolbarIndexNavigator } from "@/components/overlay-toolbar/OverlayToolbarIndexNavigator";
import { OverlayToolbarZoomControl } from "@/components/overlay-toolbar/OverlayToolbarZoomControl";

type PdfOverlayToolbarProps = {
  currentPage: number;
  numPages: number;
  scalePercent: number;
  minScalePercent: number;
  maxScalePercent: number;
  zoomStepPercent?: number;
  onCommitPage: (nextPage: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onScalePercentChange: (nextPercent: number) => void;
  canGoToPrevPage: boolean;
  canGoToNextPage: boolean;
  disabled?: boolean;
};

export const PdfOverlayToolbar = ({
  currentPage,
  numPages,
  scalePercent,
  minScalePercent,
  maxScalePercent,
  zoomStepPercent = 1,
  onCommitPage,
  onPrevPage,
  onNextPage,
  onScalePercentChange,
  canGoToPrevPage,
  canGoToNextPage,
  disabled = false,
}: PdfOverlayToolbarProps) => {
  return (
    <OverlayToolbar>
      <OverlayToolbarButton
        onClick={onPrevPage}
        label="前のページ"
        disabled={disabled || !canGoToPrevPage}
        className="h-6 w-6"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </OverlayToolbarButton>

      <OverlayToolbarButton
        onClick={onNextPage}
        label="次のページ"
        disabled={disabled || !canGoToNextPage}
        className="h-6 w-6"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </OverlayToolbarButton>

      <OverlayToolbarDivider />

      <OverlayToolbarIndexNavigator
        value={currentPage}
        total={numPages}
        onCommit={onCommitPage}
        inputAriaLabel="PDFページ番号"
      />

      <OverlayToolbarDivider />

      <OverlayToolbarZoomControl
        value={scalePercent}
        min={minScalePercent}
        max={maxScalePercent}
        step={zoomStepPercent}
        onChange={onScalePercentChange}
        label="PDFズーム"
        disabled={disabled}
        sliderWrapperClassName="w-20 px-0.5 sm:w-24"
        valueClassName="min-w-[2.5rem] text-center text-[10px] font-semibold tabular-nums text-[#6b5f55]"
      />
    </OverlayToolbar>
  );
};
