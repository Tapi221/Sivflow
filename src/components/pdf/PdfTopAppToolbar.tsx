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

type PdfToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  compact?: boolean;
  children: ReactNode;
};

type PdfToolbarInputProps = InputHTMLAttributes<HTMLInputElement>;

const toolbarTextClassName =
  "text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal";

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

const PdfToolbarDivider = () => {
  return <div className="mx-1 h-5 w-px shrink-0 bg-[#e2e4e9]" aria-hidden="true" />;
};

const PdfToolbarButton = ({
  className,
  active = false,
  compact = false,
  children,
  ...props
}: PdfToolbarButtonProps) => {
  return (
    <button
      type="button"
      className={cn(
        "rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        toolbarTextClassName,
        compact
          ? "inline-flex h-7 w-7 shrink-0 items-center justify-center text-[#8f929c] hover:bg-[#f6f7f9] hover:text-[#25272d]"
          : "inline-flex h-9 shrink-0 items-center gap-[6px] rounded-[10px] border border-[#d9dde5] bg-white px-4 text-[#25272d] hover:bg-[#f6f7f9]",
        active &&
          !compact &&
          "border-[#cfd5df] bg-[#f6f7f9] text-[#25272d]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const PdfToolbarInput = ({ className, ...props }: PdfToolbarInputProps) => {
  return (
    <input
      className={cn(
        "h-9 w-[96px] rounded-[10px] border border-[#d9dde5] bg-white px-3 text-center text-[#25272d] shadow-none outline-none transition focus:border-[#c7cdd8] focus:ring-2 focus:ring-ring/20",
        toolbarTextClassName,
        className,
      )}
      {...props}
    />
  );
};

const ToolbarIconBase = ({
  className,
  children,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
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
    <ToolbarIconBase>
      <path
        d="M10 3.5L5.5 8L10 12.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ToolbarIconBase>
  );
};

const ChevronRightIcon = () => {
  return (
    <ToolbarIconBase>
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ToolbarIconBase>
  );
};

const MinusIcon = () => {
  return (
    <ToolbarIconBase>
      <path
        d="M4 8H12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </ToolbarIconBase>
  );
};

const PlusIcon = () => {
  return (
    <ToolbarIconBase>
      <path
        d="M8 4V12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M4 8H12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </ToolbarIconBase>
  );
};

const FitWidthIcon = () => {
  return (
    <ToolbarIconBase>
      <rect
        x="2.25"
        y="2.75"
        width="11.5"
        height="10.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M5.5 8H3.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M4.6 7.1L3.5 8L4.6 8.9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 8H12.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M11.4 7.1L12.5 8L11.4 8.9"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ToolbarIconBase>
  );
};

const SinglePageIcon = () => {
  return (
    <ToolbarIconBase>
      <rect
        x="3.75"
        y="2.5"
        width="8.5"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </ToolbarIconBase>
  );
};

const DoublePageIcon = () => {
  return (
    <ToolbarIconBase>
      <rect
        x="2.25"
        y="3"
        width="4.75"
        height="10"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect
        x="9"
        y="3"
        width="4.75"
        height="10"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </ToolbarIconBase>
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

    const trimmedValue = pageInput.trim();
    if (trimmedValue.length === 0) {
      setPageInput(String(alignedCurrentPage));
      return;
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue)) {
      setPageInput(String(alignedCurrentPage));
      return;
    }

    const nextPage = Math.min(numPages, Math.max(1, Math.trunc(parsedValue)));
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
        "relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center overflow-x-auto bg-white px-4 after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']",
        className,
      )}
    >
      <div className="flex min-w-max items-center gap-[6px]">
        <PdfToolbarButton
          compact
          aria-label="前のページ"
          title="前のページ"
          onClick={handlePrev}
          disabled={!canGoToPrevPage}
        >
          <ChevronLeftIcon />
        </PdfToolbarButton>

        <PdfToolbarButton
          compact
          aria-label="次のページ"
          title="次のページ"
          onClick={handleNext}
          disabled={!canGoToNextPage}
        >
          <ChevronRightIcon />
        </PdfToolbarButton>
      </div>

      <div className="ml-3 flex min-w-max items-center gap-[6px]">
        <PdfToolbarDivider />

        <PdfToolbarInput
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

        <span className={cn("shrink-0 text-[#8f929c]", toolbarTextClassName)}>
          / {numPages}
        </span>

        <PdfToolbarButton
          compact
          aria-label="縮小"
          title="縮小"
          onClick={handleZoomOut}
        >
          <MinusIcon />
        </PdfToolbarButton>

        <PdfToolbarButton
          compact
          aria-label="拡大"
          title="拡大"
          onClick={handleZoomIn}
        >
          <PlusIcon />
        </PdfToolbarButton>

        <span
          className={cn(
            "inline-flex min-w-[52px] items-center justify-center text-[#25272d]",
            toolbarTextClassName,
          )}
        >
          {zoomLabel}
        </span>

        <PdfToolbarDivider />

        <PdfToolbarButton
          active={fitMode === "width"}
          aria-label="幅に合わせる"
          title="幅に合わせる"
          onClick={handleFitWidth}
        >
          <FitWidthIcon />
          <span>幅に合わせる</span>
        </PdfToolbarButton>

        <PdfToolbarButton
          active={pageLayoutMode === "single"}
          aria-label="1ページ表示"
          title="1ページ表示"
          onClick={() => {
            handlePageLayoutChange("single");
          }}
        >
          <SinglePageIcon />
          <span>1ページ</span>
        </PdfToolbarButton>

        <PdfToolbarButton
          active={pageLayoutMode === "double"}
          aria-label="2ページ表示"
          title="2ページ表示"
          disabled={numPages <= 1}
          onClick={() => {
            handlePageLayoutChange("double");
          }}
        >
          <DoublePageIcon />
          <span>2ページ</span>
        </PdfToolbarButton>
      </div>
    </div>
  );
};