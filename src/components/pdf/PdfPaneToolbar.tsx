/**
 * PDF ビューアの補助ツールバー。
 * 検索・外部オープンと状態表示を担い、
 * ページ移動・ズーム・幅フィットは下部オーバーレイ側に集約する。
 */
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/ui/icons";

interface PdfPaneToolbarProps {
  isLocalOnly: boolean;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  sourceUnavailable: boolean;
  canOpenExternal: boolean;
  searchQuery: string;
  totalMatches: number;
  activeMatchIndex: number;
  onSearchQueryChange: (value: string) => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onOpenNewTab: () => void;
}

export const PdfPaneToolbar = ({
  isLocalOnly,
  uploadStatus,
  sourceUnavailable,
  canOpenExternal,
  searchQuery,
  totalMatches,
  activeMatchIndex,
  onSearchQueryChange,
  onPrevMatch,
  onNextMatch,
  onOpenNewTab,
}: PdfPaneToolbarProps) => {
  const searchInputId = useId();

  const statusMessages = [
    isLocalOnly
      ? {
          key: "local-only",
          text: "このPDFはこの端末ローカルのみです（クラウド未同期）。",
          className: "text-amber-600",
        }
      : null,
    uploadStatus === "failed"
      ? {
          key: "upload-failed",
          text: "クラウド同期に失敗しました。再アップロードを試してください。",
          className: "text-rose-600",
        }
      : null,
  ].filter(
    (
      statusMessage,
    ): statusMessage is {
      key: string;
      text: string;
      className: string;
    } => statusMessage !== null,
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        {statusMessages.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {statusMessages.map((statusMessage) => (
              <div
                key={statusMessage.key}
                className={`truncate text-[11px] ${statusMessage.className}`}
              >
                {statusMessage.text}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400">PDF表示コントロール</div>
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
          variant="ghost"
          size="sm"
          onClick={onOpenNewTab}
          disabled={!canOpenExternal}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
