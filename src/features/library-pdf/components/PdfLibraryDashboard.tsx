import { useMemo, useState } from "react";
import { cn } from "@web-renderer/lib/utils";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { PdfLibraryWorkspaceToolbar } from "./PdfLibraryWorkspaceToolbar";
import { PdfLibraryContinueSection } from "@/features/library-pdf/components/sections/PdfLibraryContinueSection";
import type { PdfDashboardRow } from "@/features/library-pdf/model/pdfLibraryRow";
import { buildPdfDashboardRows } from "@/features/library-pdf/model/pdfLibraryRow";
import { useTags } from "@/features/settings/hooks/useTags";
import type { DocumentItem, Folder } from "@/types";



type PdfLibraryDashboardProps = {
  documents: DocumentItem[];
  folders: Folder[];
  onOpenDocument: (documentId: string) => void;
  showToolbar?: boolean;
};
type IconBadgeProps = {
  label: string;
  tone?: "slate" | "green" | "violet" | "blue" | "rose";
};



const cardClassName = "box-border rounded-xl border border-[#D1D1D1] bg-[#fff] p-4 shadow-[0_6px_3px_0_rgba(0,0,0,0.06),0_10px_10px_0_rgba(0,0,0,0.05)]";



const formatDateTime = (value: Date | null): string => {
  if (!value) return "未記録";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
};
const getIconBadgeToneClassName = (tone: NonNullable<IconBadgeProps["tone"]>): string => {
  if (tone === "green") return "bg-[#f3f4f6] text-[#4b5563]";
  if (tone === "violet") return "bg-[#f5f3ff] text-[#6d5ab3]";
  if (tone === "blue") return "bg-[#eff6ff] text-[#446a9b]";
  if (tone === "rose") return "bg-[#fff1f2] text-[#c06268]";
  return "bg-[#f3f4f6] text-[#6b7280]";
};



const IconBadge = ({ label, tone = "slate" }: IconBadgeProps) => {
  if (label === "PDF") {
    return <span className="inline-flex h-6 min-w-8 items-center justify-center rounded-md border border-[#f1c7c7] bg-[#fff8f8] px-1.5 text-xs font-semibold text-[#E72A2A]" aria-label="PDF">PDF</span>;
  }

  return <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold", getIconBadgeToneClassName(tone))}>{label}</span>;
};
const PdfLibraryDashboard = ({ documents, folders, onOpenDocument, showToolbar = true }: PdfLibraryDashboardProps) => {
  const { tagById } = useTags();
  const [, setExpandedFolders] = useState<Set<string>>(() => new Set());

  const rows = useMemo<PdfDashboardRow[]>(() => {
    return buildPdfDashboardRows({ documents, folders, tagById });
  }, [documents, folders, tagById]);

  const importTargetFolderId = rows[0]?.folderId ?? folders[0]?.id ?? null;

  const getNextOrderIndex = (folderId: string | null): number => {
    if (!folderId) return 0;
    return documents.filter((document) => document.kind === "pdf" && document.folderId === folderId).reduce((currentMax, document) => Math.max(currentMax, Number.isFinite(Number(document.orderIndex)) ? Number(document.orderIndex) : 0), -1) + 1;
  };

  const { fileInputRef, currentFileAccept, handleToolbarAddDocument, handleToolbarFileInputChange } = useFolderDocumentUpload({
    actionFolderId: importTargetFolderId,
    getNextOrderIndex,
    setExpandedFolders,
  });

  const continueRows = useMemo(() => {
    return rows
      .filter((row) => {
        const progress = row.progressPercent ?? 0;
        return progress > 0 && progress < 100;
      })
      .sort((left, right) => {
        const rightTime = right.lastViewedAt?.getTime() ?? right.updatedAt?.getTime() ?? 0;
        const leftTime = left.lastViewedAt?.getTime() ?? left.updatedAt?.getTime() ?? 0;
        if (rightTime !== leftTime) return rightTime - leftTime;
        return (right.progressPercent ?? 0) - (left.progressPercent ?? 0);
      })
      .slice(0, 3);
  }, [rows]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#fff]">
      {showToolbar && <PdfLibraryWorkspaceToolbar activeSection="pdf" onSelectSection={() => undefined} onAddPdf={handleToolbarAddDocument} />}
      <input ref={fileInputRef} type="file" accept={currentFileAccept} multiple className="hidden" onChange={handleToolbarFileInputChange} />
      <div className="grid min-h-0 w-full grid-cols-1 gap-4 pt-4">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <PdfLibraryContinueSection cardClassName={cardClassName} continueRows={continueRows} formatDateTime={formatDateTime} onSelectDocument={onOpenDocument} IconBadge={IconBadge} />
          </div>
        </div>
      </div>
    </div>
  );
};



export { PdfLibraryDashboard };


export type { PdfLibraryDashboardProps };
