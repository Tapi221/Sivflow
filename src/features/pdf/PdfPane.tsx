import { useEffect, useMemo, useState } from "react";
import type { PdfViewerState } from "@/types";
import type { BlobUrl } from "@/types/core/branded";
import { cn } from "@/lib/utils";
import { getDocumentBlob } from "@/services/documentFileStore";

type PdfPaneDoc = {
  id: string;
  userId?: string;
  name?: string;
  title?: string;
  fileName?: string;
  remoteUrl?: string | null;
  blobUrl?: BlobUrl | null;
  localUrl?: BlobUrl | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
  googleDriveWebViewLink?: string | null;
  googleDriveWebContentLink?: string | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  updatedAt?: unknown;
  mimeType?: string;
  viewerState?: PdfViewerState | null;
};

type PdfPaneProps = {
  doc: PdfPaneDoc;
  className?: string;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onDocumentUpdate?: (updates: Partial<PdfPaneDoc>) => Promise<void> | void;
};

type PdfSidePanelTabDefinition = {
  id: NonNullable<PdfViewerState["sidePanelTab"]>;
  label: string;
};

const PDF_SIDE_PANEL_TABS: readonly PdfSidePanelTabDefinition[] = [
  { id: "outline", label: "目次" },
  { id: "bookmarks", label: "ブックマーク" },
  { id: "highlights" as NonNullable<PdfViewerState["sidePanelTab"]>, label: "ハイライト" },
  { id: "thumbnails", label: "サムネイル" },
];
const DEFAULT_PDF_PAGE = 1;
const DEFAULT_PDF_SCALE = 1;
const PDF_FIT_WIDTH_ZOOM = "page-width";

const resolveDocumentTitle = (doc: PdfPaneDoc): string => {
  return doc.title?.trim() || doc.fileName?.trim() || doc.name?.trim() || "PDF";
};

const resolvePersistedUrl = (doc: PdfPaneDoc): string | null => {
  return doc.blobUrl ?? doc.localUrl ?? doc.downloadUrl ?? doc.googleDriveWebContentLink ?? doc.remoteUrl ?? doc.googleDriveWebViewLink ?? null;
};

const resolveDocumentFileId = (doc: PdfPaneDoc): string => {
  return doc.localFileId?.trim() || doc.id;
};

const buildPdfFragment = (viewerState: PdfViewerState | null | undefined): string => {
  const currentPage = Math.max(DEFAULT_PDF_PAGE, Math.floor(viewerState?.currentPage ?? DEFAULT_PDF_PAGE));
  const zoom = viewerState?.fitMode === "manual" && typeof viewerState.scale === "number" && Number.isFinite(viewerState.scale) ? String(Math.max(25, Math.round(viewerState.scale * 100))) : PDF_FIT_WIDTH_ZOOM;
  return `page=${currentPage}&zoom=${zoom}`;
};

const buildPdfSourceUrl = (url: string, viewerState: PdfViewerState | null | undefined): string => {
  const [baseUrl] = url.split("#");
  return `${baseUrl}#${buildPdfFragment(viewerState)}`;
};

const PdfPane = ({ doc, className, onDocumentUpdate }: PdfPaneProps) => {
  const documentTitle = useMemo(() => resolveDocumentTitle(doc), [doc]);
  const persistedUrl = useMemo(() => resolvePersistedUrl(doc), [doc]);
  const viewerState = doc.viewerState ?? null;
  const activeSidePanelTab = viewerState?.sidePanelTab ?? "outline";
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [isLoadingLocalFile, setIsLoadingLocalFile] = useState(false);
  const [localFileError, setLocalFileError] = useState<string | null>(null);
  const sourceUrl = persistedUrl ?? localObjectUrl;
  const embeddedSourceUrl = sourceUrl ? buildPdfSourceUrl(sourceUrl, viewerState) : null;

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    setLocalObjectUrl(null);
    setLocalFileError(null);

    if (persistedUrl) {
      setIsLoadingLocalFile(false);
      return () => undefined;
    }

    const fileId = resolveDocumentFileId(doc);
    setIsLoadingLocalFile(true);

    void getDocumentBlob(fileId, { userId: doc.userId }).then((blob) => {
      if (isCancelled) return;
      if (!blob) {
        setLocalFileError("PDFファイル本体がローカルストアに見つかりません。");
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setLocalObjectUrl(objectUrl);
    }).catch((error: unknown) => {
      if (isCancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      setLocalFileError(message || "PDFファイルの読み込みに失敗しました。");
    }).finally(() => {
      if (!isCancelled) setIsLoadingLocalFile(false);
    });

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, persistedUrl]);

  const handleSidePanelTabSelect = (sidePanelTab: NonNullable<PdfViewerState["sidePanelTab"]>) => {
    void onDocumentUpdate?.({ viewerState: { ...viewerState, sidePanelTab } });
  };

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 bg-[#151515] text-[#f4f1ea]", className)}>
      <aside className="flex w-[268px] shrink-0 flex-col border-r border-white/10 bg-[#1f1f1f]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f9b93]">PDF</div>
          <div title={documentTitle} className="mt-1 truncate text-[14px] font-semibold text-[#f4f1ea]">{documentTitle}</div>
        </div>
        <div className="flex gap-1 border-b border-white/10 p-2">
          {PDF_SIDE_PANEL_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => handleSidePanelTabSelect(tab.id)} className={cn("min-w-0 flex-1 rounded-[7px] px-2 py-1.5 text-[11px] font-semibold text-[#aaa59b] transition-colors hover:bg-white/10 hover:text-[#f4f1ea]", activeSidePanelTab === tab.id && "bg-white/12 text-[#f4f1ea]")}>{tab.label}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-5 text-[#aaa59b]">
          {activeSidePanelTab === "outline" ? <p>目次・参照ジャンプ・概要表示はこの領域に載せます。現在はPDF本体の表示を優先しています。</p> : null}
          {activeSidePanelTab === "bookmarks" ? <p>ブックマーク保存用の状態は viewerState に保持できます。ページ位置の抽出と同期は次の実装対象です。</p> : null}
          {activeSidePanelTab === "thumbnails" ? <p>サムネイル一覧はPDFページレンダリング層を入れた後に生成します。</p> : null}
          {activeSidePanelTab !== "outline" && activeSidePanelTab !== "bookmarks" && activeSidePanelTab !== "thumbnails" ? <p>ハイライト検索はテキストレイヤー実装後に追加します。</p> : null}
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#202020] px-3">
          <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#d8d3c9]">{documentTitle}</div>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">別ウィンドウで開く</a> : null}
          {sourceUrl ? <a href={sourceUrl} download={documentTitle} className="rounded-[8px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#d8d3c9] transition-colors hover:bg-white/10">ダウンロード</a> : null}
        </div>
        <div className="min-h-0 flex-1 bg-[#2b2b2b] p-3">
          {isLoadingLocalFile ? <div className="flex h-full items-center justify-center text-[13px] text-[#bdb8ad]">PDFを読み込み中...</div> : null}
          {!isLoadingLocalFile && localFileError ? <div className="flex h-full items-center justify-center p-6 text-center text-[13px] leading-6 text-[#d8d3c9]"><div className="max-w-md rounded-[14px] border border-white/10 bg-[#1f1f1f] px-5 py-4">{localFileError}</div></div> : null}
          {!isLoadingLocalFile && !localFileError && embeddedSourceUrl ? <iframe title={documentTitle} src={embeddedSourceUrl} className="h-full w-full rounded-[10px] border border-black/20 bg-white" /> : null}
          {!isLoadingLocalFile && !localFileError && !embeddedSourceUrl ? <div className="flex h-full items-center justify-center text-[13px] text-[#bdb8ad]">表示できるPDFソースがありません。</div> : null}
        </div>
      </main>
    </div>
  );
};

export { PdfPane };
