import { cn } from "@/lib/utils";
import type { PdfLibraryRow } from "@/features/library-pdf/model/pdfLibraryRow";
import { FileText, History, RefreshCw } from "@/ui/icons";

type PdfLibrarySummaryCardsProps = {
  continueRows: PdfLibraryRow[];
  recentRows: PdfLibraryRow[];
  onOpenDocument: (documentId: string) => void;
};

const cardClassName =
  "rounded-[18px] border border-[#e5e7eb] bg-[#FFFFFF] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]";

const iconWrapClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] text-[#52606d]";

const buildProgressLabel = (row: PdfLibraryRow): string => {
  const currentPage = row.currentPage ?? 0;
  const pageCount = row.pageCount ?? 0;

  if (currentPage <= 0 || pageCount <= 0) {
    return "続きから再開できます";
  }

  return `${currentPage} / ${pageCount} ページ`;
};

const SummaryList = ({
  rows,
  emptyLabel,
  onOpenDocument,
  variant,
}: {
  rows: PdfLibraryRow[];
  emptyLabel: string;
  onOpenDocument: (documentId: string) => void;
  variant: "continue" | "recent";
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fafafa] px-4 py-5 text-sm text-[#7b8794]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <button
          key={row.id}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-colors",
            "hover:border-[#dfe4ea] hover:bg-[#f8fafc]",
          )}
          type="button"
          onClick={() => onOpenDocument(row.id)}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff1f2] text-[#e11d48]">
            <FileText size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#1f2937]">
              {row.fileName}
            </span>
            <span className="mt-1 block truncate text-xs text-[#6b7280]">
              {variant === "continue" ? buildProgressLabel(row) : row.folderPathLabel}
            </span>
          </span>
          {variant === "continue" ? (
            <span className="rounded-full bg-[#eef6ef] px-2.5 py-1 text-[11px] font-semibold text-[#4f6b54]">
              {row.progressPercent ?? 0}%
            </span>
          ) : (
            <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#6b7280]">
              更新
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export const PdfLibrarySummaryCards = ({
  continueRows,
  recentRows,
  onOpenDocument,
}: PdfLibrarySummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className={cardClassName}>
        <div className="flex items-start gap-3">
          <span className={iconWrapClassName}>
            <History size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#20262a]">続きを読む</h2>
            <p className="mt-1 text-sm text-[#6f7b78]">
              閲覧途中の PDF を、前回の位置からすぐ再開します。
            </p>
          </div>
        </div>
        <div className="mt-5">
          <SummaryList
            emptyLabel="閲覧途中の PDF はまだありません。"
            rows={continueRows}
            variant="continue"
            onOpenDocument={onOpenDocument}
          />
        </div>
      </section>

      <section className={cardClassName}>
        <div className="flex items-start gap-3">
          <span className={iconWrapClassName}>
            <RefreshCw size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#20262a]">最近更新</h2>
            <p className="mt-1 text-sm text-[#6f7b78]">
              直近で追加または更新された PDF を一覧で確認できます。
            </p>
          </div>
        </div>
        <div className="mt-5">
          <SummaryList
            emptyLabel="最近更新された PDF はまだありません。"
            rows={recentRows}
            variant="recent"
            onOpenDocument={onOpenDocument}
          />
        </div>
      </section>
    </div>
  );
};
