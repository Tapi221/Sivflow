import type { ComponentType } from "react";

import type { PdfDashboardRow } from "@/features/library-pdf/model/pdfLibraryRow";

type IconBadgeTone = "slate" | "green" | "violet" | "blue" | "rose";

type IconBadgeComponent = ComponentType<{
  label: string;
  tone?: IconBadgeTone;
}>;

type PdfLibraryRecentSectionProps = {
  cardClassName: string;
  recentRows: PdfDashboardRow[];
  onSelectDocument: (documentId: string) => void;
  IconBadge: IconBadgeComponent;
};

export const PdfLibraryRecentSection = ({
  cardClassName,
  recentRows,
  onSelectDocument,
  IconBadge,
}: PdfLibraryRecentSectionProps) => {
  return (
    <section className={cardClassName}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge label="更" tone="green" />
          <span className="text-[13px] font-semibold text-[#30403d]">
            最近更新したPDF
          </span>
        </div>
        <span className="text-[12px] font-semibold text-[#6b7280]">
          すべて見る
        </span>
      </div>

      <div className="mt-4 divide-y divide-[#eef0f3] border-y border-[#e5e7eb]">
        {recentRows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="flex h-8 w-full items-center gap-3 text-left transition-colors hover:bg-[#fafafa]"
            onClick={() => onSelectDocument(row.id)}
          >
            <IconBadge label="PDF" tone="rose" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium leading-[17px] text-[#273038]">
                {row.title}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
