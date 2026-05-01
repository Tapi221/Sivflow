import { useEffect, useMemo, useState } from "react";

import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useSetBreadcrumbAction } from "@/contexts/BreadcrumbContext";
import { useTags } from "@/hooks/settings/useTags";
import type { DocumentItem, Folder } from "@/types";

import { PdfLibraryEmptyState } from "./PdfLibraryEmptyState";
import { PdfLibrarySummaryCards } from "./PdfLibrarySummaryCards";
import { PdfLibraryDataTable } from "./data-table/PdfLibraryDataTable";
import { buildPdfLibraryRows } from "@/features/library-pdf/model/pdfLibraryRow";

type PdfLibraryDashboardProps = {
  documents: DocumentItem[];
  folders: Folder[];
  onOpenDocument: (documentId: string) => void;
};

const breadcrumbActionIconClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-transparent text-[#ababab] transition-colors hover:bg-[rgba(0,0,0,0.04)]";

const BreadcrumbActionSettingsIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M4 7H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2.25" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8" cy="12" r="2.25" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="13" cy="17" r="2.25" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
};

const BreadcrumbActionFilterIcon = () => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.75 6.75H19.25L13.75 13.125V18.25L10.25 16.25V13.125L4.75 6.75Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PdfLibraryDashboard = ({
  documents,
  folders,
  onOpenDocument,
}: PdfLibraryDashboardProps) => {
  const { tagById } = useTags();
  const setBreadcrumbAction = useSetBreadcrumbAction();
  const [, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      buildPdfLibraryRows({
        documents,
        folders,
        tagById,
      }),
    [documents, folders, tagById],
  );

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedDocumentId(null);
      return;
    }

    setSelectedDocumentId((currentValue) => {
      if (currentValue && rows.some((row) => row.id === currentValue)) {
        return currentValue;
      }

      return rows[0]?.id ?? null;
    });
  }, [rows]);

  const selectedRow = useMemo(() => {
    if (!selectedDocumentId) {
      return null;
    }

    return rows.find((row) => row.id === selectedDocumentId) ?? null;
  }, [rows, selectedDocumentId]);

  const importTargetFolderId =
    selectedRow?.folderId ?? rows[0]?.folderId ?? folders[0]?.id ?? null;

  const getNextOrderIndex = (folderId: string | null): number => {
    if (!folderId) {
      return 0;
    }

    return (
      documents
        .filter(
          (document) =>
            document.kind === "pdf" && document.folderId === folderId,
        )
        .reduce(
          (currentMax, document) =>
            Math.max(currentMax, Number(document.orderIndex) || 0),
          -1,
        ) + 1
    );
  };

  const {
    fileInputRef,
    handleToolbarAddDocument,
    currentFileAccept,
    handleToolbarFileInputChange,
  } = useFolderDocumentUpload({
    actionFolderId: importTargetFolderId,
    getNextOrderIndex,
    setExpandedFolders,
  });

  const breadcrumbAction = useMemo(
    () => (
      <div
        className="inline-flex items-center gap-2"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <button
          type="button"
          className="inline-flex h-8 w-fit items-center justify-center rounded-[8px] border-0 bg-[#6A876E] px-5 text-[12px] font-medium leading-normal text-white transition-colors hover:bg-[#5f7963]"
          onClick={handleToolbarAddDocument}
        >
          PDFをインポート
        </button>
        <div className="inline-flex items-center gap-1">
          <span aria-hidden="true" className={breadcrumbActionIconClassName}>
            <BreadcrumbActionSettingsIcon />
          </span>
          <span aria-hidden="true" className={breadcrumbActionIconClassName}>
            <BreadcrumbActionFilterIcon />
          </span>
        </div>
      </div>
    ),
    [handleToolbarAddDocument],
  );

  useEffect(() => {
    setBreadcrumbAction(breadcrumbAction);

    return () => {
      setBreadcrumbAction(null);
    };
  }, [breadcrumbAction, setBreadcrumbAction]);

  const continueRows = useMemo(() => {
    return rows
      .filter((row) => {
        const progress = row.progressPercent ?? 0;
        return progress > 0 && progress < 100;
      })
      .sort((left, right) => {
        const rightTime =
          right.lastViewedAt?.getTime() ?? right.updatedAt?.getTime() ?? 0;
        const leftTime =
          left.lastViewedAt?.getTime() ?? left.updatedAt?.getTime() ?? 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return (right.progressPercent ?? 0) - (left.progressPercent ?? 0);
      })
      .slice(0, 3);
  }, [rows]);

  const recentRows = useMemo(() => {
    return [...rows]
      .sort(
        (left, right) =>
          (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0),
      )
      .slice(0, 3);
  }, [rows]);

  if (rows.length === 0) {
    return (
      <PdfLibraryEmptyState
        currentFileAccept={currentFileAccept}
        fileInputRef={fileInputRef}
        onFileInputChange={handleToolbarFileInputChange}
        onImportClick={handleToolbarAddDocument}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full bg-[#FFFFFF]">
      <input
        ref={fileInputRef}
        accept={currentFileAccept}
        className="hidden"
        multiple
        type="file"
        onChange={handleToolbarFileInputChange}
      />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto px-6 py-6">
        <div className="flex w-full flex-1 flex-col gap-6">
          <PdfLibrarySummaryCards
            continueRows={continueRows}
            recentRows={recentRows}
            onOpenDocument={onOpenDocument}
          />

          <PdfLibraryDataTable
            rows={rows}
            selectedDocumentId={selectedDocumentId}
            onOpenDocument={onOpenDocument}
            onSelectDocument={setSelectedDocumentId}
          />
        </div>
      </div>
    </div>
  );
};
