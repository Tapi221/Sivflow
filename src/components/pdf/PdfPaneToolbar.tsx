/**
 * PDF ビューアのヘッダーツールバー。
 * ページ移動・ズーム・フィット・検索・外部オープンと状態表示を含む。
 */
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ExternalLink,
} from "@/ui/icons";
import { FIT_MIN_SCALE, FIT_MAX_SCALE } from "./pdfViewerStateStorage";

interface PdfPaneToolbarProps {
  isLocalOnly: boolean;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  currentPage: number;
  numPages: number;
  scale: number;
  fitMode: "width" | "manual";
  sourceUnavailable: boolean;
  canOpenExternal: boolean;
  searchQuery: string;
  totalMatches: number;
  activeMatchIndex: number;
  onSearchQueryChange: (value: string) => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitWidth: () => void;
  onOpenNewTab: () => void;
}

export const PdfPaneToolbar = ({
  isLocalOnly,
  uploadStatus,
  currentPage,
  numPages,
  scale,
  fitMode,
  sourceUnavailable,
  canOpenExternal,
  searchQuery,
  totalMatches,
  activeMatchIndex,
  onSearchQueryChange,
  onPrevMatch,
  onNextMatch,
  onPrev,
  onNext,
  onZoomOut,
  onZoomIn,
  onFitWidth,
  onOpenNewTab,
}: PdfPaneToolbarProps) => {
  const searchInputId = useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        {isLocalOnly && (
          <div className="truncate text-[11px] text-amber-600">
            このPDFはこの端末ローカルのみです（クラウド未同期）。
          </div>
        )}
        {uploadStatus === "failed" && (
          <div className="truncate text-[11px] text-rose-600">
            クラウド同期に失敗しました。再アップロードを試してください。
          </div>
        )}
      </div>

      <div className="flex min-w-[280px] flex-1 items-center justify-center gap-2">
        <label htmlFor={searchInputId} className="sr-only">
          PDF内検索
        </label>
        <input
          id={searchInputId}
          type="search"
          value={searchQuery}
          onChange={(event) => {
            onSearchQueryChange(event.target.value);
          }}
          placeholder="PDF内検索"
          className="h-8 w-full max-w-[240px] rounded-md border border-slate-300 bg-white px-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
          disabled={sourceUnavailable}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevMatch}
          disabled={sourceUnavailable || totalMatches <= 0}
        >
          前
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextMatch}
          disabled={sourceUnavailable || totalMatches <= 0}
        >
          次
        </Button>
        <div className="min-w-[72px] text-center text-xs text-slate-600">
          {totalMatches > 0
            ? `${activeMatchIndex + 1} / ${totalMatches}`
            : "0 / 0"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={sourceUnavailable || currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[72px] text-center text-xs text-slate-600">
          {numPages > 0 ? `${currentPage} / ${numPages}` : "0 / 0"}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={
            sourceUnavailable || numPages === 0 || currentPage >= numPages
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-6 w-px bg-slate-200" />

        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          disabled={sourceUnavailable || scale <= FIT_MIN_SCALE}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="min-w-[48px] text-center text-xs text-slate-600">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomIn}
          disabled={sourceUnavailable || scale >= FIT_MAX_SCALE}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant={fitMode === "width" ? "default" : "outline"}
          size="sm"
          onClick={onFitWidth}
          disabled={sourceUnavailable}
          className="ml-1"
        >
          幅に合わせる
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenNewTab}
          disabled={!canOpenExternal}
          className="ml-1"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
