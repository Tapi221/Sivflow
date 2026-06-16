import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@web-renderer/lib/utils";
import { copyImageBlobToClipboard } from "@/features/selection-capture/clipboardImage";
import { captureElementRectToBlob } from "@/features/selection-capture/domSelectionCapture";
import type { SelectionCaptureArea, SelectionCaptureRect } from "@/features/selection-capture/selectionCapture.types";
import { SelectionCaptureOverlay } from "@/features/selection-capture/SelectionCaptureOverlay";

type CaptureStatus = "idle" | "active" | "busy" | "copied" | "downloaded" | "failed";

const SAMPLE_CARDS = [
  {
    title: "重要語句",
    label: "Front",
    body: "ミトコンドリアは細胞内で ATP を産生する主要な細胞小器官。",
    accent: "from-sky-400 to-cyan-300",
  },
  {
    title: "解説メモ",
    label: "Back",
    body: "電子伝達系と酸化的リン酸化を関連づけて説明できるか確認する。",
    accent: "from-violet-400 to-fuchsia-300",
  },
  {
    title: "復習条件",
    label: "Schedule",
    body: "明日・3日後・7日後の間隔で再提示し、誤答時は当日中に戻す。",
    accent: "from-amber-300 to-orange-400",
  },
] as const;

const STATUS_LABELS: Record<CaptureStatus, string> = {
  idle: "範囲コピーを押すと選択を開始します。",
  active: "ドラッグしてコピーする範囲を選択してください。Esc / 右クリックでキャンセルできます。",
  busy: "選択範囲を PNG に変換しています。",
  copied: "選択範囲をクリップボードへコピーしました。",
  downloaded: "クリップボードが使えないため PNG をダウンロードしました。",
  failed: "範囲コピーに失敗しました。",
};

const triggerImageDownload = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "selection-capture.png";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const formatRect = (rect: SelectionCaptureRect | null): string => {
  if (!rect) return "未選択";
  return `${Math.round(rect.width)} × ${Math.round(rect.height)} / x:${Math.round(rect.x)} y:${Math.round(rect.y)}`;
};

const SelectionCaptureSandboxPage = () => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastRect, setLastRect] = useState<SelectionCaptureRect | null>(null);

  const setNextPreviewBlob = useCallback((blob: Blob) => {
    const nextUrl = URL.createObjectURL(blob);
    setPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return nextUrl;
    });
  }, []);

  const handleStartCapture = useCallback(() => {
    if (isBusy) return;
    setIsActive((current) => {
      const next = !current;
      setStatus(next ? "active" : "idle");
      return next;
    });
  }, [isBusy]);

  const handleCancelCapture = useCallback(() => {
    setIsActive(false);
    setIsBusy(false);
    setStatus("idle");
  }, []);

  const handleCapture = useCallback(async (area: SelectionCaptureArea) => {
    const target = targetRef.current;
    if (!target) return;

    const rect = area.rect;
    setIsBusy(true);
    setStatus("busy");
    setLastRect(rect);

    try {
      const blob = await captureElementRectToBlob(target, rect);
      setNextPreviewBlob(blob);

      try {
        await copyImageBlobToClipboard(blob);
        setStatus("copied");
      } catch (clipboardError) {
        console.warn("[SelectionCaptureSandboxPage] clipboard write failed", clipboardError);
        triggerImageDownload(blob);
        setStatus("downloaded");
      }

      setIsActive(false);
    } catch (error) {
      console.error("[SelectionCaptureSandboxPage] capture failed", error);
      setStatus("failed");
    } finally {
      setIsBusy(false);
    }
  }, [setNextPreviewBlob]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
            Selection Capture Sandbox
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <>
              <h1 className="text-3xl font-bold tracking-tight text-white">/sandbox/2 capture 確認画面</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                SelectionCaptureOverlay と captureElementRectToBlob を接続して、ドラッグ範囲を PNG 化してコピーする動作を確認します。
              </p>
            </>
            <button
              type="button"
              data-selection-capture-ignore="true"
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
                isActive
                  ? "border-cyan-200 bg-cyan-300 text-slate-950"
                  : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700",
              )}
              onClick={handleStartCapture}
            >
              {isActive ? "選択を終了" : "範囲コピー"}
            </button>
          </div>
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <div
              ref={targetRef}
              className="relative min-h-96 overflow-hidden rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(135deg,_#0f172a,_#111827_55%,_#1e1b4b)] p-6"
            >
              <div data-selection-capture-ignore="true" className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200 shadow-sm backdrop-blur">
                このラベルは capture から除外
              </div>
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Workspace</p>
                  <h2 className="mt-4 text-2xl font-bold text-white">カード編集プレビュー</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    ボタンを押してから、この枠の中をドラッグしてください。選択した範囲だけが PNG として生成されます。
                  </p>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm font-semibold text-slate-200">Last selection</p>
                    <p className="mt-2 font-mono text-sm text-cyan-200">{formatRect(lastRect)}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                  {SAMPLE_CARDS.map((card) => (
                    <article key={card.title} className="rounded-3xl border border-white/10 bg-white/95 p-5 text-slate-950 shadow-xl shadow-black/20">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{card.label}</span>
                        <span className={cn("h-3 w-16 rounded-full bg-gradient-to-r", card.accent)} />
                      </div>
                      <h3 className="mt-5 text-xl font-bold">{card.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="text-sm font-semibold text-cyan-100">DOM clone</p>
                  <p className="mt-2 text-xs leading-6 text-cyan-50/80">computed style を inline 化して SVG foreignObject に渡します。</p>
                </div>
                <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4">
                  <p className="text-sm font-semibold text-violet-100">Canvas output</p>
                  <p className="mt-2 text-xs leading-6 text-violet-50/80">選択矩形の幅と高さで canvas を作り、PNG Blob に変換します。</p>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Clipboard</p>
                  <p className="mt-2 text-xs leading-6 text-amber-50/80">ClipboardItem が使えない場合は PNG ダウンロードに切り替えます。</p>
                </div>
              </div>
              <SelectionCaptureOverlay targetRef={targetRef} active={isActive} busy={isBusy} onCancel={handleCancelCapture} onCapture={handleCapture} />
            </div>
          </div>
          <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">状態</h2>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
              {STATUS_LABELS[status]}
            </div>
            <h2 className="mt-6 text-xl font-semibold text-white">プレビュー</h2>
            <div className="mt-4 flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              {previewUrl ? (
                <img src={previewUrl} alt="capture preview" className="max-h-80 max-w-full rounded-xl object-contain" />
              ) : (
                <p className="text-center text-sm leading-7 text-slate-500">まだ capture 結果はありません。</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export { SelectionCaptureSandboxPage };
