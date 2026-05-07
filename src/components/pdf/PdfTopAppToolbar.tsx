import { cn } from "@/lib/utils";
import type { PdfPageLayoutMode } from "@/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SVGProps,
} from "react";
import { usePdfWorkspace } from "./usePdfWorkspace";

type PdfTopAppToolbarProps = {
  className?: string;
};

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  compact?: boolean;
  children: ReactNode;
};

type ToolbarInputProps = InputHTMLAttributes<HTMLInputElement>;

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

const ToolbarDivider = () => {
  return <div className="mx-1 h-5 w-px shrink-0 bg-gray-200" aria-hidden="true" />;
};

const ToolbarButton = ({
  className,
  active = false,
  compact = false,
  children,
  ...props
}: ToolbarButtonProps) => {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border text-sm transition-colors",
        "border-transparent bg-transparent text-gray-600",
        "hover:bg-gray-100 hover:text-gray-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
        "disabled:pointer-events-none disabled:opacity-40",
        compact ? "h-8 min-w-8 px-2" : "h-8 px-2.5",
        active && "border-gray-300 bg-gray-100 text-gray-900",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const ToolbarInput = ({ className, ...props }: ToolbarInputProps) => {
  return (
    <input
      className={cn(
        "h-8 w-14 rounded-md border border-gray-300 bg-white px-2 text-center text-sm text-gray-800 shadow-none outline-none transition",
        "focus:border-gray-400 focus:ring-2 focus:ring-gray-200",
        className,
      )}
      {...props}
    />
  );
};

const IconBase = ({
  className,
  children,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
};

const ChevronLeftIcon = () => {
  return (
    <IconBase>
      <path d="M9.5 3.5 5 8l4.5 4.5" />
    </IconBase>
  );
};

const ChevronRightIcon = () => {
  return (
    <IconBase>
      <path d="M6.5 3.5 11 8l-4.5 4.5" />
    </IconBase>
  );
};

const MinusIcon = () => {
  return (
    <IconBase>
      <path d="M4 8h8" />
    </IconBase>
  );
};

const PlusIcon = () => {
  return (
    <IconBase>
      <path d="M8 4v8" />
      <path d="M4 8h8" />
    </IconBase>
  );
};

const FitWidthIcon = () => {
  return (
    <IconBase>
      <rect x="2.75" y="3" width="10.5" height="10" rx="1.75" />
      <path d="M5 8H3.5" />
      <path d="M4.5 7.25 3.5 8l1 0.75" />
      <path d="M11 8h1.5" />
      <path d="M11.5 7.25 12.5 8l-1 0.75" />
    </IconBase>
  );
};

const SinglePageIcon = () => {
  return (
    <IconBase>
      <rect x="3.75" y="2.75" width="8.5" height="10.5" rx="1.5" />
    </IconBase>
  );
};

const DoublePageIcon = () => {
  return (
    <IconBase>
      <rect x="2.5" y="3.25" width="4.75" height="9.5" rx="1.25" />
      <rect x="8.75" y="3.25" width="4.75" height="9.5" rx="1.25" />
    </IconBase>
  );
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

  const [pageInput, setPageInput] = useState(() => String(alignedCurrentPage));

  useEffect(() => {
    setPageInput(String(alignedCurrentPage));
  }, [alignedCurrentPage]);

  const zoomLabel = useMemo(() => `${Math.round(zoomPercent)}%`, [zoomPercent]);

  const commitPage = useCallback(() => {
    if (!Number.isFinite(numPages) || numPages <= 0) {
      return;
    }

    const trimmed = pageInput.trim();
    if (trimmed.length === 0) {
      setPageInput(String(alignedCurrentPage));
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(alignedCurrentPage));
      return;
    }

    const nextPage = Math.min(numPages, Math.max(1, Math.trunc(parsed)));
    setPageInput(String(nextPage));
    handleCommitPage(nextPage);
  }, [alignedCurrentPage, handleCommitPage, numPages, pageInput]);

  const handleZoomOut = useCallback(() => {
    handleZoomPercentChange(clampPercent(zoomPercent - 10));
  }, [handleZoomPercentChange, zoomPercent]);

  const handleZoomIn = useCallback(() => {
    handleZoomPercentChange(clampPercent(zoomPercent + 10));
  }, [handleZoomPercentChange, zoomPercent]);

  const handlePageLayoutChange = useCallback(
    (nextMode: PdfPageLayoutMode) => {
      handlePageLayoutModeChange(nextMode);
    },
    [handlePageLayoutModeChange],
  );

  return (
    <div
      className={cn(
        "flex h-12 w-full items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 text-gray-700",
        className,
      )}
    >
      <div className="flex min-w-max items-center gap-0.5">
        <ToolbarButton
          compact
          onClick={handlePrev}
          disabled={!canGoToPrevPage}
          aria-label="前のページ"
          title="前のページ"
        >
          <ChevronLeftIcon />
        </ToolbarButton>

        <ToolbarButton
          compact
          onClick={handleNext}
          disabled={!canGoToNextPage}
          aria-label="次のページ"
          title="次のページ"
        >
          <ChevronRightIcon />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="flex min-w-max items-center gap-2">
        <ToolbarInput
          value={pageInput}
          inputMode="numeric"
          aria-label="ページ番号"
          onChange={(event) => {
            setPageInput(event.currentTarget.value.replace(/\D+/g, ""));
          }}
          onBlur={commitPage}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) {
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              commitPage();
              event.currentTarget.blur();
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setPageInput(String(alignedCurrentPage));
              event.currentTarget.blur();
            }
          }}
        />

        <span className="shrink-0 text-sm text-gray-500">/ {numPages}</span>
      </div>

      <div className="flex min-w-max items-center gap-0.5">
        <ToolbarButton
          compact
          onClick={handleZoomOut}
          aria-label="縮小"
          title="縮小"
        >
          <MinusIcon />
        </ToolbarButton>

        <ToolbarButton
          compact
          onClick={handleZoomIn}
          aria-label="拡大"
          title="拡大"
        >
          <PlusIcon />
        </ToolbarButton>

        <div className="inline-flex h-8 min-w-[3.75rem] items-center justify-center rounded-md px-2 text-sm text-gray-700">
          {zoomLabel}
        </div>
      </div>

      <ToolbarDivider />

      <div className="flex min-w-max items-center gap-0.5">
        <ToolbarButton
          onClick={handleFitWidth}
          active={fitMode === "width"}
          aria-label="幅に合わせる"
          title="幅に合わせる"
        >
          <FitWidthIcon />
          <span>幅に合わせる</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            handlePageLayoutChange("single");
          }}
          active={pageLayoutMode === "single"}
          aria-label="1ページ表示"
          title="1ページ表示"
        >
          <SinglePageIcon />
          <span>1ページ</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            handlePageLayoutChange("double");
          }}
          active={pageLayoutMode === "double"}
          disabled={numPages <= 1}
          aria-label="2ページ表示"
          title="2ページ表示"
        >
          <DoublePageIcon />
          <span>2ページ</span>
        </ToolbarButton>
      </div>
    </div>
  );
};