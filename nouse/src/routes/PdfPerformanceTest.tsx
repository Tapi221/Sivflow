import { useEffect, useMemo, useState } from "react";
import type { PdfDocumentSource } from "@/features/pdf/pdfDocumentSource";
import { createPdfDocumentDataSourceFromBlob, releasePdfDocumentSource } from "@/features/pdf/pdfDocumentSource";
import { PdfPane } from "@/features/pdf/PdfPane";
import type { PdfViewerState } from "@/types";



type PdfObject = {
  id: number;
  body: string;
};



const PDF_PERFORMANCE_TEST_PAGE_COUNT = 36;
const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_TEXT_X = 72;
const PDF_TITLE_Y = 720;
const PDF_BODY_Y = 690;



const escapePdfText = (text: string): string => text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
const createPdfStreamObject = (content: string): string => `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
const createPdfContentStream = (pageNumber: number): string => {
  const title = escapePdfText(`Sivflow PDF performance fixture ${pageNumber}`);
  const body = escapePdfText("This generated PDF is used by Playwright to exercise pdf.js scrolling, cleanup, and performance marks.");
  return [`BT /F1 18 Tf ${PDF_TEXT_X} ${PDF_TITLE_Y} Td (${title}) Tj ET`, `BT /F1 11 Tf ${PDF_TEXT_X} ${PDF_BODY_Y} Td (${body}) Tj ET`].join("\n");
};
const getByteLength = (value: string): number => new TextEncoder().encode(value).length;
const createSyntheticPdfBlob = (pageCount: number): Blob => {
  const objects: PdfObject[] = [];
  const pageObjectIds = Array.from({ length: pageCount }, (_, index) => 4 + index * 2);
  const contentObjectIds = pageObjectIds.map((pageObjectId) => pageObjectId + 1);
  objects.push({ id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" });
  objects.push({ id: 2, body: `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>` });
  objects.push({ id: 3, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" });
  pageObjectIds.forEach((pageObjectId, index) => {
    const contentObjectId = contentObjectIds[index];
    objects.push({ id: pageObjectId, body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>` });
    objects.push({ id: contentObjectId, body: createPdfStreamObject(createPdfContentStream(index + 1)) });
  });
  objects.sort((a, b) => a.id - b.id);
  let content = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object) => {
    offsets[object.id] = getByteLength(content);
    content += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  });
  const xrefOffset = getByteLength(content);
  const size = objects.at(-1)?.id ?? 0;
  content += `xref\n0 ${size + 1}\n`;
  content += "0000000000 65535 f \n";
  for (let id = 1; id <= size; id += 1) content += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  content += `trailer\n<< /Size ${size + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Blob([content], { type: "application/pdf" });
};



const PdfPerformanceTest = () => {
  const canRender = useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("test_bypass") === "true", []);
  const [isViewerVisible, setIsViewerVisible] = useState(true);
  const [source, setSource] = useState<PdfDocumentSource | null>(null);
  const [viewerState, setViewerState] = useState<PdfViewerState | null>(null);
  const shouldRenderViewer = isViewerVisible && source !== null;
  useEffect(() => {
    if (!canRender || !isViewerVisible) {
      setSource(null);
      return;
    }
    let isCancelled = false;
    let resolvedSource: PdfDocumentSource | null = null;
    let isSourceHandedOff = false;
    void createPdfDocumentDataSourceFromBlob(createSyntheticPdfBlob(PDF_PERFORMANCE_TEST_PAGE_COUNT)).then((nextSource) => {
      if (isCancelled) {
        releasePdfDocumentSource(nextSource);
        return;
      }
      resolvedSource = nextSource;
      isSourceHandedOff = true;
      setSource(nextSource);
    });
    return () => {
      isCancelled = true;
      if (!isSourceHandedOff) releasePdfDocumentSource(resolvedSource);
    };
  }, [canRender, isViewerVisible]);
  if (!canRender) return null;
  return (
    <main className="h-screen min-h-0 w-full min-w-0 flex-1 bg-[var(--carvepanel-surface)]" data-testid="pdf-performance-root">
      <div className="flex h-12 items-center gap-3 border-b border-black/10 px-4 text-xs text-[#2f2f2f]">
        <button className="rounded border border-black/20 px-3 py-1" data-testid="pdf-performance-toggle" type="button" onClick={() => setIsViewerVisible((current) => !current)}>
          {isViewerVisible ? "Close PDF" : "Open PDF"}
        </button>
        <span data-testid="pdf-performance-source-type">{source?.type ?? "none"}</span>
      </div>
      <div className="h-[calc(100vh-3rem)] min-h-0" data-testid="pdf-performance-viewer-host">
        {shouldRenderViewer && <PdfPane source={source} viewerState={viewerState} onViewerStateChange={setViewerState} />}
      </div>
    </main>
  );
};



export { PdfPerformanceTest };
