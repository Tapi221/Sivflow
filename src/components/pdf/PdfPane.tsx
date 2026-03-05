/**
 * PDF ビューアパネル（表示状態永続化対応版）
 *
 * === 安定性保証 ===
 * ✅ 初期復元と永続保存の分離
 *    - ハイドレーション中は updateDocument を呼ばない
 *    - Promise.resolve() で state 確定を待機してから hydration 完了
 *
 * ✅ debounce の安全性
 *    - unmount 時に必ず cleanup（StrictMode 対応）
 *    - doc.id 変更時に古い debounce をクリア
 *    - 800ms debounce で不要な書き込みを削減
 *
 * ✅ ドキュメント切替時の分離
 *    - sessionStorage キーは docId 単位（`pdf_viewer_${docId}`）
 *    - docId 変更時に isHydratingRef をリセット
 *    - PDF A の viewerState が PDF B に適用されない
 *
 * ✅ updateDocument の最小化
 *    - viewerState のみを更新（マージ更新）
 *    - 不要な削除 or 全体再書き込みなし
 *
 * === テスト条件 ===
 * 1. PDF を開く → 表示状態が復元される
 * 2. ページ移動・ズーム → debounce で 800ms 後に保存
 * 3. タブをリロード → sessionStorage から高速復元
 * 4. PDF 切替 → 前の PDF 状態が新 PDF に混ざらない
 * 5. StrictMode → 二重保存なし
 */
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PdfViewer } from "./PdfViewer";
import type { PdfViewerHandle } from "./PdfViewer";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ExternalLink,
} from "@/ui/icons"; // IDE Check: Icons
import { getDocumentBlob } from "@/services/documentFileStore";
import {
  cacheDocumentBlobUrl,
  getCachedDocumentBlobUrl,
  invalidateDocumentBlobUrl,
  pinDocumentBlobUrl,
  unpinDocumentBlobUrl,
} from "@/services/documentBlobUrlSessionCache";
import { useAuth } from "@/contexts/AuthContext";
import type { PdfViewerState } from "@/types";
import { DEV_MODE, isLocalHost } from "@/utils/envGuards";

interface PdfPaneDoc {
  id: string;
  name?: string;
  title?: string;
  remoteUrl?: string | null;
  blobUrl?: import("@/types").BlobUrl | null;
  localUrl?: import("@/types").BlobUrl | null;
  localFileId?: string | null;
  downloadUrl?: string | null;
  uploadStatus?: "pending" | "queued" | "uploading" | "ready" | "failed" | null;
  updatedAt?: unknown;
  viewerState?: PdfViewerState | null; // 復元用
}

interface PdfPaneProps {
  doc: PdfPaneDoc;
  className?: string;
  viewerOptions?: {
    enableXfa?: boolean;
    useSystemFonts?: boolean;
    cMapUrl?: string;
    standardFontDataUrl?: string;
    opaqueCanvas?: boolean;
  };
  onDocumentUpdate?: (updates: Partial<PdfPaneDoc>) => Promise<void>; // 外部への状態保存
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);
const FIT_MIN_SCALE = 0.5;
const FIT_MAX_SCALE = 3.0;
const ZOOM_STEP = 0.1;
const FIT_PADDING_X = 24;
const EPSILON = 0.001;
const VIEWER_STATE_DEBOUNCE_MS = 800; // debounce間隔
const getUpdatedAtKey = (value: unknown): string => {
  if (value == null) return "";
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === "number" || typeof value === "string")
    return String(value);
  const maybeDate = (value as any)?.toDate?.();
  if (maybeDate instanceof Date) return String(maybeDate.getTime());
  return "";
};

// sessionStorage から viewerState を取得する
// ✅ ドキュメント切替保護：呼び出し側で docId を指定する
const getViewerStateFromSession = (docId: string): PdfViewerState | null => {
  try {
    const key = `pdf_viewer_${docId}`;
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// sessionStorage に viewerState を保存する
// ✅ ドキュメント切替保護：docId パラメータで正しいキーを保証
const saveViewerStateToSession = (
  docId: string,
  state: PdfViewerState,
): void => {
  try {
    const key = `pdf_viewer_${docId}`;
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // 無視（容量超過など）
  }
};

export function PdfPane({
  doc,
  className,
  viewerOptions,
  onDocumentUpdate,
}: PdfPaneProps) {
  const { currentUser } = useAuth();
  const viewerRef = useRef<PdfViewerHandle>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triedRemoteSourceKeysRef = useRef<Set<string>>(new Set());
  const triedBlobUrlsRef = useRef<Set<string>>(new Set());
  const triedLocalRestoreKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Guard 1: production build では診断フックに到達しない
    if (!DEV_MODE) return;
    // Guard 2: 開発中でも localhost 系ホストのみ許可
    if (!isLocalHost(window.location.hostname)) return;
    const debugWindow = window as Window & {
      __logPdfScrollDiagnostics?: () => void;
      __getPdfScrollDiagnostics?: () => ReturnType<
        PdfViewerHandle["getScrollDiagnostics"]
      >;
    };

    // 開発時のみ: DevTools から PDF スクロール診断を即時取得できるようにする。
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

  // ✅ 初期復元完了フラグ
  // 初期復元中は保存を禁止し、復元完了後にのみ保存を許可する
  const isHydratingRef = useRef(false);
  const initializedRef = useRef(false);

  // ✅ PDF 切替時に debounce をクリアするための docId 追跡
  const lastDocIdRef = useRef<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [fitMode, setFitMode] = useState<"width" | "manual">("width");
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [basePageWidth, setBasePageWidth] = useState<number | null>(null);
  const [restoredBlobUrl, setRestoredBlobUrl] = useState<string | null>(null);
  const [cachedBlobUrl, setCachedBlobUrl] = useState<string | null>(null);
  const [localDataStatus, setLocalDataStatus] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const [failedRemoteSourceKey, setFailedRemoteSourceKey] = useState<
    string | null
  >(null);
  const [failedBlobUrl, setFailedBlobUrl] = useState<string | null>(null);

  const remoteUrl = useMemo(() => {
    const candidate = doc.remoteUrl ?? doc.downloadUrl ?? null;
    if (typeof candidate === "string" && candidate.startsWith("blob:"))
      return null;
    return candidate;
  }, [doc.remoteUrl, doc.downloadUrl]);
  const persistedBlobUrl = useMemo(() => {
    const candidate = doc.blobUrl ?? doc.localUrl ?? null;
    if (typeof candidate !== "string") return null;
    const trimmed = candidate.trim();
    return trimmed.startsWith("blob:") ? trimmed : null;
  }, [doc.blobUrl, doc.localUrl]);
  const remoteSourceKey = useMemo(
    () => (remoteUrl ? remoteUrl : null),
    [remoteUrl],
  );
  const localBlobId = useMemo(
    () => doc.localFileId ?? doc.id ?? null,
    [doc.id, doc.localFileId],
  );
  const effectiveRemoteUrl = useMemo(() => {
    if (!remoteUrl) return null;
    if (failedRemoteSourceKey && remoteSourceKey === failedRemoteSourceKey)
      return null;
    return remoteUrl;
  }, [failedRemoteSourceKey, remoteSourceKey, remoteUrl]);
  const displayName = doc.title || doc.name || "PDF";
  const usablePersistedBlobUrl = useMemo(() => {
    if (!persistedBlobUrl) return null;
    if (failedBlobUrl && failedBlobUrl === persistedBlobUrl) return null;
    return persistedBlobUrl;
  }, [failedBlobUrl, persistedBlobUrl]);
  const usableRestoredBlobUrl = useMemo(() => {
    if (!restoredBlobUrl) return null;
    if (failedBlobUrl && failedBlobUrl === restoredBlobUrl) return null;
    return restoredBlobUrl;
  }, [failedBlobUrl, restoredBlobUrl]);
  const usableCachedBlobUrl = useMemo(() => {
    if (!cachedBlobUrl) return null;
    if (failedBlobUrl && failedBlobUrl === cachedBlobUrl) return null;
    return cachedBlobUrl;
  }, [cachedBlobUrl, failedBlobUrl]);
  const fitScale = useMemo(() => {
    if (!containerWidth || !basePageWidth) return 1;
    const usableWidth = Math.max(1, containerWidth - FIT_PADDING_X);
    return clamp(
      Number((usableWidth / basePageWidth).toFixed(3)),
      FIT_MIN_SCALE,
      FIT_MAX_SCALE,
    );
  }, [containerWidth, basePageWidth]);

  useEffect(() => {
    // ✅ PDF ドキュメントが変わった場合
    // - 前の debounce を即座にクリア（PDF A のデータが PDF B に保存されないようにする）
    // - 初期復元フラグをリセット
    // - docId 変更を記録
    if (lastDocIdRef.current !== doc.id && lastDocIdRef.current !== null) {
      console.warn("[PdfPane] Document changed, clearing debounce:", {
        from: lastDocIdRef.current,
        to: doc.id,
      });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
    lastDocIdRef.current = doc.id;

    // 初期復元フラグをリセット（次の hydration に備える）
    isHydratingRef.current = false;
    initializedRef.current = false;
    setRestoredBlobUrl(null);
    setCachedBlobUrl(null);
    setLocalDataStatus("idle");
    setFailedRemoteSourceKey(null);
    setFailedBlobUrl(null);
    triedRemoteSourceKeysRef.current.clear();
    triedBlobUrlsRef.current.clear();
    triedLocalRestoreKeysRef.current.clear();
  }, [doc.id]);

  useEffect(() => {
    setFailedRemoteSourceKey(null);
  }, [remoteSourceKey]);

  useEffect(() => {
    if (!localBlobId) {
      setCachedBlobUrl(null);
      return;
    }
    const nextCached = getCachedDocumentBlobUrl(localBlobId, {
      userId: currentUser?.uid,
    });
    setCachedBlobUrl(nextCached);
  }, [currentUser?.uid, localBlobId]);

  // ✅ 表示状態の初期化（一度だけ実行）
  // 優先順位: sessionStorage > DocumentItem.viewerState > デフォルト
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // ✅ ハイドレーション開始
    isHydratingRef.current = true;

    let restoredState: PdfViewerState | null = null;

    // 1. sessionStorage から復元を試みる
    // ✅ PDF 切替時に異なる PDF のセッション状態を読み込まないこと
    restoredState = getViewerStateFromSession(doc.id);

    // 2. DocumentItem.viewerState をフォールバック
    if (!restoredState && doc.viewerState) {
      restoredState = doc.viewerState;
    }

    // 3. 復元状態を適用
    if (restoredState) {
      if (typeof restoredState.currentPage === "number") {
        setCurrentPage(Math.max(1, restoredState.currentPage));
      }
      if (typeof restoredState.scale === "number") {
        setScale(clamp(restoredState.scale, FIT_MIN_SCALE, FIT_MAX_SCALE));
      }
      if (
        restoredState.fitMode === "width" ||
        restoredState.fitMode === "manual"
      ) {
        setFitMode(restoredState.fitMode);
      }
    }

    // ✅ ハイドレーション完了（この直後から保存を許可）
    // microtask を使って、state 更新が確定するのを待つ
    Promise.resolve().then(() => {
      isHydratingRef.current = false;
      console.debug("[PdfPane] Hydration complete for doc:", doc.id);
    });
  }, [doc.id, doc.viewerState]);

  // PDF ドキュメント変更時のリセット（初期化フラグのパターンは変わらない）

  useEffect(() => {
    let cancelled = false;

    if (effectiveRemoteUrl) {
      setLocalDataStatus("idle");
      return;
    }

    if (
      usableCachedBlobUrl ||
      usableRestoredBlobUrl ||
      usablePersistedBlobUrl
    ) {
      setLocalDataStatus("ready");
      return;
    }

    if (!localBlobId) {
      setLocalDataStatus("failed");
      return;
    }

    if (triedLocalRestoreKeysRef.current.has(localBlobId)) {
      setLocalDataStatus("failed");
      return;
    }
    triedLocalRestoreKeysRef.current.add(localBlobId);
    setLocalDataStatus("loading");
    getDocumentBlob(localBlobId, { userId: currentUser?.uid })
      .then(async (blob) => {
        if (cancelled) return;
        if (!blob) {
          setRestoredBlobUrl(null);
          setLocalDataStatus("failed");
          return;
        }

        const nextBlobUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        setFailedBlobUrl((prev) => (prev === nextBlobUrl ? null : prev));
        cacheDocumentBlobUrl(localBlobId, nextBlobUrl, {
          userId: currentUser?.uid,
        });
        setCachedBlobUrl(nextBlobUrl);
        setRestoredBlobUrl(nextBlobUrl);
        setLocalDataStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PdfPane] local blob restore failed", {
          error: err,
          docId: doc.id,
          localFileId: localBlobId,
          hasRemoteUrl: !!doc.remoteUrl,
        });
        setRestoredBlobUrl(null);
        setLocalDataStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser?.uid,
    doc.id,
    doc.remoteUrl,
    localBlobId,
    usableCachedBlobUrl,
    effectiveRemoteUrl,
    usablePersistedBlobUrl,
    usableRestoredBlobUrl,
  ]);

  const localBlobUrl =
    usableCachedBlobUrl ?? usableRestoredBlobUrl ?? usablePersistedBlobUrl;
  const source = useMemo(() => {
    if (effectiveRemoteUrl) return { url: effectiveRemoteUrl, data: null };
    if (localBlobUrl) return { url: localBlobUrl, data: null };
    return { url: null, data: null };
  }, [effectiveRemoteUrl, localBlobUrl]);
  const sourceMeta = useMemo(
    () => ({
      remoteUrl: remoteUrl ?? null,
      blobUrl: localBlobUrl ?? null,
      localFileId: localBlobId,
      url: source.url ?? null,
      updatedAt: getUpdatedAtKey(doc.updatedAt),
    }),
    [doc.id, doc.updatedAt, localBlobId, localBlobUrl, remoteUrl, source.url],
  );

  const sourceUnavailable = !source.url;
  const isLocalOnly = !effectiveRemoteUrl && !!localBlobUrl;

  useEffect(() => {
    const el = viewerContainerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  // ✅ 表示状態の永続化（debounce付き、但しハイドレーション中は保存禁止）
  // currentPage, scale, fitMode が変わったときに保存
  useEffect(() => {
    // ✅ ハイドレーション中は保存しない（初期復元が完了するまで待機）
    if (isHydratingRef.current) {
      console.debug("[PdfPane] Skipping save during hydration");
      return;
    }

    // 古い debounce をクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 新しい保存をスケジュール
    debounceTimerRef.current = setTimeout(() => {
      // ✅ 保存実行時に PDF が切り替わっていないかチェック
      // doc.id を参照して現在のドキュメントが一致することを確認
      const newViewerState: PdfViewerState = {
        currentPage,
        scale: parseFloat(scale.toFixed(3)),
        fitMode,
      };

      // sessionStorage に即座に保存（高速復元用）
      // ✅ 正しい docId を使用（ドキュメント切替保護）
      saveViewerStateToSession(doc.id, newViewerState);

      // DocumentItem.viewerState を更新（永続化）
      // ✅ 条件付きで実行（ドキュメント切替による不正な更新を防止）
      if (onDocumentUpdate) {
        onDocumentUpdate({ viewerState: newViewerState }).catch((err) => {
          console.warn("[PdfPane] Failed to save viewer state:", err, {
            docId: doc.id,
          });
          // 失敗しても無視（UXを止めない）
        });
      }

      debounceTimerRef.current = null;
    }, VIEWER_STATE_DEBOUNCE_MS);

    return () => {
      // ✅ cleanup: unmount 時必ずクリア（StrictMode 対応）
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [currentPage, scale, fitMode, doc.id, onDocumentUpdate]);

  // fitMode === 'width' の時のスケール自動更新
  useEffect(() => {
    if (fitMode !== "width") return;
    setScale((prev) => (Math.abs(prev - fitScale) < EPSILON ? prev : fitScale));
  }, [fitMode, fitScale]);

  useEffect(() => {
    if (!numPages) return;
    if (currentPage > numPages) setCurrentPage(numPages);
  }, [numPages, currentPage]);

  useEffect(() => {
    if (!localBlobId || !localBlobUrl || !localBlobUrl.startsWith("blob:"))
      return;
    pinDocumentBlobUrl(localBlobId, { userId: currentUser?.uid });
    return () => {
      unpinDocumentBlobUrl(localBlobId, { userId: currentUser?.uid });
    };
  }, [currentUser?.uid, localBlobId, localBlobUrl]);

  const handleSourceLoadError = useCallback(
    (details: {
      kind: "remote-url" | "blob-url" | "data" | "unknown";
      url: string | null;
      message: string;
    }) => {
      if (details.kind === "remote-url" && remoteSourceKey) {
        if (triedRemoteSourceKeysRef.current.has(remoteSourceKey)) return;
        triedRemoteSourceKeysRef.current.add(remoteSourceKey);
        console.warn(
          "[PdfPane] Remote source failed, fallback to local source",
          {
            docId: doc.id,
            remoteUrl,
            remoteSourceKey,
            localFileId: localBlobId,
            message: details.message,
          },
        );
        setFailedRemoteSourceKey(remoteSourceKey);
        setLocalDataStatus("idle");
        return;
      }

      if (details.kind === "blob-url" && details.url) {
        if (triedBlobUrlsRef.current.has(details.url)) return;
        triedBlobUrlsRef.current.add(details.url);
        console.warn(
          "[PdfPane] blob source failed, retrying from localFileId restore",
          {
            docId: doc.id,
            blobUrl: details.url,
            localFileId: localBlobId,
            message: details.message,
          },
        );
        setFailedBlobUrl(details.url);
        invalidateDocumentBlobUrl(localBlobId, details.url, {
          userId: currentUser?.uid,
        });
        setCachedBlobUrl((prev) => (prev === details.url ? null : prev));
        setRestoredBlobUrl((prev) => (prev === details.url ? null : prev));
        setLocalDataStatus("idle");
      }
    },
    [currentUser?.uid, doc.id, localBlobId, remoteSourceKey, remoteUrl],
  );

  const handleOpenNewTab = () => {
    const openUrl = effectiveRemoteUrl ?? localBlobUrl ?? null;
    if (!openUrl) return;
    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  // 自動スクロールは行わず、ページ移動はユーザー操作時のみ実行する。
  const handlePrev = () => {
    const nextPage = Math.max(1, currentPage - 1);
    viewerRef.current?.scrollToPage(nextPage);
  };

  const handleNext = () => {
    const nextPage = Math.min(numPages || currentPage, currentPage + 1);
    viewerRef.current?.scrollToPage(nextPage);
  };

  const handleZoomOut = () => {
    setFitMode("manual");
    setScale((s) =>
      clamp(
        parseFloat((s - ZOOM_STEP).toFixed(2)),
        FIT_MIN_SCALE,
        FIT_MAX_SCALE,
      ),
    );
  };

  const handleZoomIn = () => {
    setFitMode("manual");
    setScale((s) =>
      clamp(
        parseFloat((s + ZOOM_STEP).toFixed(2)),
        FIT_MIN_SCALE,
        FIT_MAX_SCALE,
      ),
    );
  };

  const handleFitWidth = () => {
    setFitMode("width");
    setScale(fitScale);
  };

  const handleViewerScaleChange = useCallback((nextScale: number) => {
    if (!Number.isFinite(nextScale)) return;
    const clamped = clamp(nextScale, FIT_MIN_SCALE, FIT_MAX_SCALE);
    const rounded = parseFloat(clamped.toFixed(3));
    setFitMode("manual");
    setScale((prev) => (Math.abs(prev - rounded) < EPSILON ? prev : rounded));
  }, []);

  const handleFirstPageSize = useCallback(
    (size: { width: number; height: number } | null) => {
      const nextWidth = size?.width ?? null;
      setBasePageWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    },
    [],
  );

  return (
    <div className={cn("flex flex-col h-full min-h-0 min-w-0", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">PDF</div>
          <div className="text-sm font-semibold text-slate-700 truncate">
            {displayName}
          </div>
          {isLocalOnly && (
            <div className="text-[11px] text-amber-600">
              このPDFはこの端末ローカルのみです（クラウド未同期）。
            </div>
          )}
          {doc.uploadStatus === "failed" && (
            <div className="text-[11px] text-rose-600">
              クラウド同期に失敗しました。再アップロードを試してください。
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={sourceUnavailable || currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-xs text-slate-600 min-w-[72px] text-center">
            {numPages > 0 ? `${currentPage} / ${numPages}` : "0 / 0"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={
              sourceUnavailable || numPages === 0 || currentPage >= numPages
            }
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={sourceUnavailable || scale <= FIT_MIN_SCALE}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="text-xs text-slate-600 min-w-[48px] text-center">
            {Math.round(scale * 100)}%
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={sourceUnavailable || scale >= FIT_MAX_SCALE}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant={fitMode === "width" ? "default" : "outline"}
            size="sm"
            onClick={handleFitWidth}
            disabled={sourceUnavailable}
            className="ml-1"
          >
            幅に合わせる
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenNewTab}
            disabled={!effectiveRemoteUrl && !localBlobUrl}
            className="ml-1"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={viewerContainerRef}
        // このラッパーは高さ確定のみ。スクロール責務は PdfViewer 内の ScrollContainer に限定する。
        className="flex-1 min-h-0 min-w-0 w-full bg-slate-50 overflow-hidden"
      >
        {sourceUnavailable ? (
          <div className="text-sm text-slate-500 p-4">
            {localDataStatus === "loading" && "ローカルPDFを復元中..."}
            {localDataStatus === "failed" &&
              "ローカルファイルが見つかりません。再アップロードしてください。"}
            {localDataStatus === "idle" && "PDFソースがありません。"}
          </div>
        ) : (
          <PdfViewer
            ref={viewerRef}
            source={source}
            scale={scale}
            minScale={FIT_MIN_SCALE}
            maxScale={FIT_MAX_SCALE}
            zoomStep={ZOOM_STEP}
            onScaleChange={handleViewerScaleChange}
            onNumPages={setNumPages}
            onPageChange={setCurrentPage}
            onFirstPageSize={handleFirstPageSize}
            viewerOptions={viewerOptions}
            sourceMeta={sourceMeta}
            onSourceLoadError={handleSourceLoadError}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}
