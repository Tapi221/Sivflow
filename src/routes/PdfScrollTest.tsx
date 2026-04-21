import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import type { PdfViewerHandle } from "@/components/pdf/PdfViewer";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";

const createE2EPdfData = (pageCount = 14): Uint8Array => {
  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(100, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const kids: string[] = [];
  let nextId = 3;

  for (let page = 1; page <= pageCount; page += 1) {
    const pageId = nextId++;
    const contentId = nextId++;
    kids.push(`${pageId} 0 R`);

    const stream = [
      "BT",
      "/F1 24 Tf",
      "72 720 Td",
      `(PDF E2E Scroll Page ${page}) Tj`,
      "ET",
    ].join("\n");

    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 100 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(
      contentId,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }

  objects.set(
    2,
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`,
  );

  const ids = Array.from(objects.keys()).sort((left, right) => left - right);
  const maxId = ids[ids.length - 1];
  const offsets: Array<number | null> = new Array(maxId + 1).fill(null);

  let out = "%PDF-1.4\n";
  for (const id of ids) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }

  const xrefStart = out.length;
  out += `xref\n0 ${maxId + 1}\n`;
  out += "0000000000 65535 f \n";

  for (let id = 1; id <= maxId; id += 1) {
    const offset = offsets[id];
    out +=
      typeof offset === "number"
        ? `${String(offset).padStart(10, "0")} 00000 n \n`
        : "0000000000 00000 f \n";
  }

  out += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let index = 0; index < out.length; index += 1) {
    bytes[index] = out.charCodeAt(index) & 0xff;
  }

  return bytes;
};

const PdfScrollTest = () => {
  const viewerRef = useRef<PdfViewerHandle>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pdfData = useMemo(() => createE2EPdfData(14), []);
  const pdfBlobUrl = useMemo(() => {
    return URL.createObjectURL(
      new Blob([pdfData.buffer as BlobPart], { type: "application/pdf" }),
    );
  }, [pdfData]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (!DEV_MODE) return;
    if (!isLocalHost(window.location.hostname)) return;

    const debugWindow = window as Window & {
      __logPdfScrollDiagnostics?: () => void;
      __getPdfScrollDiagnostics?: () => ReturnType<
        PdfViewerHandle["getScrollDiagnostics"]
      >;
    };

    debugWindow.__logPdfScrollDiagnostics = () => {
      viewerRef.current?.logScrollDiagnostics();
    };
    debugWindow.__getPdfScrollDiagnostics = () => {
      return viewerRef.current?.getScrollDiagnostics() ?? null;
    };

    return () => {
      delete debugWindow.__logPdfScrollDiagnostics;
      delete debugWindow.__getPdfScrollDiagnostics;
    };
  }, []);

  return (
    <div className="h-[100dvh] w-full overflow-hidden p-3">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <div className="text-sm text-slate-700">
            PDF scroll test: {numPages > 0 ? `${currentPage} / ${numPages}` : "loading"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => viewerRef.current?.logScrollDiagnostics()}
          >
            Log Scroll Diagnostics
          </Button>
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-hidden bg-slate-50">
          <PdfViewer
            ref={viewerRef}
            source={{ data: null, url: pdfBlobUrl }}
            onNumPages={setNumPages}
            onPageChange={setCurrentPage}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default PdfScrollTest;
