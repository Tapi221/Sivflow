import { useEffect, useMemo, useState } from "react";

import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { Button } from "@/components/ui/button";
import { useSetBreadcrumbAction } from "@/contexts/BreadcrumbContext";
import { useTags } from "@/hooks/settings/useTags";
import type { DocumentItem, Folder } from "@/types";
import { Filter, Settings2 } from "@/ui/icons";

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
  "inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] text-[#7b8794] transition-colors hover:bg-[#f8fafc]";

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

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
  };

  const handleOpenDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    onOpenDocument(documentId);
  };

  const breadcrumbAction = useMemo(
    () => (
      <div
        className="inline-flex items-center gap-2"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <Button
          className="h-8 rounded-[10px] px-4 text-[12px] font-semibold"
          type="button"
          onClick={handleToolbarAddDocument}
        >
          PDF をインポート
        </Button>
        <div className="inline-flex items-center gap-1">
          <span aria-hidden="true" className={breadcrumbActionIconClassName}>
            <Settings2 size={16} />
          </span>
          <span aria-hidden="true" className={breadcrumbActionIconClassName}>
            <Filter size={16} />
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
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6">
          <PdfLibrarySummaryCards
            continueRows={continueRows}
            recentRows={recentRows}
            onOpenDocument={handleOpenDocument}
          />

          <PdfLibraryDataTable
            rows={rows}
            selectedDocumentId={selectedDocumentId}
            onOpenDocument={handleOpenDocument}
            onSelectDocument={handleSelectDocument}
          />
        </div>
      </div>
    </div>
  );
};
