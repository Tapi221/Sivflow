import type { ComponentType, CSSProperties } from "react";
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



const dateTimeTextStyle: CSSProperties = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Hiragino Sans\", \"Noto Sans JP\", system-ui, sans-serif",
  fontVariantNumeric: "tabular-nums",
};



const PdfLibraryContinueSection = ({ cardClassName, continueRows, formatDateTime, onSelectDocument, IconBadge }: PdfLibraryContinueSectionProps) => {
  if (continueRows.length === 0) {
    return null;
  }

  return (
    <section className={cardClassName}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge label="読" tone="green" />
          <span className="text-xs font-semibold text-[#30403d]">
            続きから読む
          </span>
        </div>
        <span className="text-xs font-semibold text-[#6b7280]">
          すべて見る
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {continueRows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="flex w-full items-start gap-3 text-left"
            onClick={() => onSelectDocument(row.id)}
          >
            <IconBadge label="PDF" tone="rose" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold leading-5 text-[#29343b]">
                {row.title}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                  className="h-full rounded-full bg-[#4b5563]"
                  style={{ width: `${row.progressPercent ?? 0}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[#7d8784]">
                <span className="truncate">
                  最終閲覧:{" "}
                  <span className="whitespace-nowrap" style={dateTimeTextStyle}>
                    {formatDateTime(row.lastViewedAt)}
                  </span>
                </span>
                <span className="font-semibold text-[#5f6f69]">
                  {row.progressPercent ?? 0}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};



export { PdfLibraryContinueSection };
