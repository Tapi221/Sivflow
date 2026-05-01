import type { ComponentType } from "react";

import type { PdfDashboardRow } from "@/features/library-pdf/model/pdfLibraryRow";

type IconBadgeTone = "slate" | "green" | "violet" | "blue" | "rose";

type IconBadgeComponent = ComponentType<{
  label: string;
  tone?: IconBadgeTone;
}>;

type PdfLibraryContinueSectionProps = {
  cardClassName: string;
  continueRows: PdfDashboardRow[];
  formatDateTime: (value: Date | null) => string;
  onSelectDocument: (documentId: string) => void;
  IconBadge: IconBadgeComponent;
};

export const PdfLibraryContinueSection = ({
  cardClassName,
  continueRows,
  formatDateTime,
  onSelectDocument,
  IconBadge,
}: PdfLibraryContinueSectionProps) => {
  return (
    <section className={cardClassName}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge label="読" tone="green" />
          <span className="text-[13px] font-semibold text-[#30403d]">
            続きから読む
          </span>
        </div>
        <span className="text-[12px] font-semibold text-[#6b7280]">
          すべて見る
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {continueRows.length > 0 ? (
          continueRows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="flex w-full items-start gap-3 text-left"
              onClick={() => onSelectDocument(row.id)}
            >
              <IconBadge label="PDF" tone="rose" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold leading-5 text-[#29343b]">
                  {row.title}
                </div>
                <div className="mt-2 h-[6px] overflow-hidden rounded-[999px] bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-[999px] bg-[#4b5563]"
                    style={{ width: `${row.progressPercent ?? 0}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-[#7d8784]">
                  <span className="truncate">
                    最終閲覧: {formatDateTime(row.lastViewedAt)}
                  </span>
                  <span className="font-semibold text-[#5f6f69]">
                    {row.progressPercent ?? 0}%
                  </span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[16px] bg-[#f8fafc] px-4 py-5 text-[13px] leading-6 text-[#94a09a]">
            続きから読める PDF はまだありません。
          </div>
        )}
      </div>
    </section>
  );
};
