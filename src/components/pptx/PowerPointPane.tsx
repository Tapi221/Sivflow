import { cn } from "@/lib/utils";
import { Loader2 } from "@/ui/icons";
import { PowerPointViewer } from "./PowerPointViewer";
import { PowerPointPaneHeader } from "./PowerPointPaneHeader";
import { PowerPointPaneState } from "./PowerPointPaneState";
import { usePowerPointPaneController } from "./hooks/usePowerPointPaneController";
import { normalizeString } from "./domain/pptxConversion";
import type { DocumentItem } from "@/types";

interface PowerPointPaneProps {
  doc: DocumentItem;
  className?: string;
}

export const PowerPointPane = ({ doc, className }: PowerPointPaneProps) => {
  const {
    docState,
    displayName,
    currentSlide,
    setCurrentSlide,
    effectiveSlideCount,
    slides,
    scale,
    setScale,
    loadingManifest,
    manifestPending,
    manifestError,
    manifestStatus,
    conversionError,
    conversionErrorLabel,
    hasReachedAutoRetryLimit,
    hasScheduledAutoRetry,
    nextRetryLabel,
    isOnline,
    offlineWithoutReadyManifest,
    viewerReady,
    canOpenSource,
    handleOpenSource,
    localSourceStatus,
    handlePrev,
    handleNext,
    handleRetryConversion,
    viewerRef,
  } = usePowerPointPaneController(doc);

  const remoteSourceUrl = normalizeString(
    docState.remoteUrl ?? docState.downloadUrl ?? null,
  );

  return (
    <div className={cn("flex flex-col h-full min-w-0", className)}>
      <PowerPointPaneHeader
        displayName={displayName}
        isOnline={isOnline}
        manifestStatus={manifestStatus}
        uploadStatus={docState.uploadStatus}
        remoteSourceUrl={remoteSourceUrl}
        localSourceStatus={localSourceStatus}
        currentSlide={currentSlide}
        effectiveSlideCount={effectiveSlideCount}
        viewerReady={viewerReady}
        onPrev={handlePrev}
        onNext={handleNext}
        scale={scale}
        onScaleChange={setScale}
        canOpenSource={canOpenSource}
        onOpenSource={handleOpenSource}
      />

      <div className="flex-1 min-w-0 w-full bg-slate-50">
        {loadingManifest && manifestStatus === "ready" && (
          <div className="text-sm text-slate-500 p-4 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {manifestPending
              ? "変換結果の manifest 生成を待機中..."
              : "スライド情報を読み込み中..."}
          </div>
        )}

        {viewerReady && (
          <PowerPointViewer
            ref={viewerRef}
            slides={slides}
            scale={scale}
            onSlideChange={setCurrentSlide}
            className="h-full w-full"
          />
        )}

        {!viewerReady && !loadingManifest && (
          <PowerPointPaneState
            offlineWithoutReadyManifest={offlineWithoutReadyManifest}
            manifestPending={manifestPending}
            manifestStatus={manifestStatus}
            manifestError={manifestError}
            conversionError={conversionError}
            conversionErrorLabel={conversionErrorLabel}
            uploadStatus={docState.uploadStatus}
            isOnline={isOnline}
            hasScheduledAutoRetry={hasScheduledAutoRetry}
            hasReachedAutoRetryLimit={hasReachedAutoRetryLimit}
            nextRetryLabel={nextRetryLabel}
            canOpenSource={canOpenSource}
            onRetry={handleRetryConversion}
            onOpenSource={handleOpenSource}
          />
        )}
      </div>
    </div>
  );
};
