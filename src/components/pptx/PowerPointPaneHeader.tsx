/**
 * Header bar for PowerPointPane.
 * Displays: title/status, slide navigation, zoom controls, open-source button.
 * Fully props-driven, no internal state.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Minus,
  Plus,
} from "@/ui/icons";
import { clamp } from "./domain/pptxConversion";
import type { LocalSourceStatus } from "./hooks/useLocalDocumentSource";

interface PowerPointPaneHeaderProps {
  displayName: string;
  isOnline: boolean;
  manifestStatus: string;
  uploadStatus: string | undefined;
  remoteSourceUrl: string | null;
  localSourceStatus: LocalSourceStatus;

  // Navigation
  currentSlide: number;
  effectiveSlideCount: number;
  viewerReady: boolean;
  onPrev: () => void;
  onNext: () => void;

  // Zoom
  scale: number;
  onScaleChange: (updater: (prev: number) => number) => void;

  // Source open
  canOpenSource: boolean;
  onOpenSource: () => void;
}

export function PowerPointPaneHeader({
  displayName,
  isOnline,
  manifestStatus,
  uploadStatus,
  remoteSourceUrl,
  localSourceStatus,
  currentSlide,
  effectiveSlideCount,
  viewerReady,
  onPrev,
  onNext,
  scale,
  onScaleChange,
  canOpenSource,
  onOpenSource,
}: PowerPointPaneHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
      <div className="min-w-0">
        <div className="text-xs text-slate-400">PowerPoint</div>
        <div className="text-sm font-semibold text-slate-700 truncate">
          {displayName}
        </div>
        {!isOnline && manifestStatus !== "ready" && (
          <div className="text-[11px] text-amber-600">
            オフライン中: 変換キューは保留されます。
          </div>
        )}
        {uploadStatus === "failed" && (
          <div className="text-[11px] text-rose-600">
            原本アップロードに失敗しています。
          </div>
        )}
        {!remoteSourceUrl && localSourceStatus === "failed" && (
          <div className="text-[11px] text-rose-600">
            ローカル原本が見つかりません。再アップロードしてください。
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!viewerReady || currentSlide <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-xs text-slate-600 min-w-[72px] text-center">
          {effectiveSlideCount > 0
            ? `${currentSlide} / ${effectiveSlideCount}`
            : "0 / 0"}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={
            !viewerReady ||
            effectiveSlideCount === 0 ||
            currentSlide >= effectiveSlideCount
          }
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onScaleChange((s) =>
              clamp(parseFloat((s - 0.1).toFixed(2)), 0.5, 3.0),
            )
          }
          disabled={!viewerReady || scale <= 0.5}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div className="text-xs text-slate-600 min-w-[48px] text-center">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onScaleChange((s) =>
              clamp(parseFloat((s + 0.1).toFixed(2)), 0.5, 3.0),
            )
          }
          disabled={!viewerReady || scale >= 3.0}
        >
          <Plus className="w-4 h-4" />
        </Button>

        {canOpenSource && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSource}
            className="ml-1"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}



