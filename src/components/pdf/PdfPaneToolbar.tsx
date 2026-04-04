/**
 * PDF ビューアのヘッダーツールバー。
 * ページ移動・ズーム・フィット・外部オープンと状態表示を含む。
 * 親から props を受けるだけで、副作用を持たない純粋な UI コンポーネント。
 */
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ExternalLink,
} from "@/ui/icons"; // IDE Check: Icons
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
  onPrev,
  onNext,
  onZoomOut,
  onZoomIn,
  onFitWidth,
  onOpenNewTab,
}: PdfPaneToolbarProps) => {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
      {(isLocalOnly || uploadStatus === "failed") ? (
        <div className="min-w-0 flex-1">
          {isLocalOnly && (
            <div className="text-[11px] text-amber-600 truncate">
              このPDFはこの端末ローカルのみです（クラウド未同期）。
            </div>
          )}
          {uploadStatus === "failed" && (
            <div className="text-[11px] text-rose-600 truncate">
              クラウド同期に失敗しました。再アップロードを試してください。
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={sourceUnavailable || currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-xs text-slate-600 min-w-[72px] text-center">
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
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          disabled={sourceUnavailable || scale <= FIT_MIN_SCALE}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div className="text-xs text-slate-600 min-w-[48px] text-center">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomIn}
          disabled={sourceUnavailable || scale >= FIT_MAX_SCALE}
        >
          <Plus className="w-4 h-4" />
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
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
