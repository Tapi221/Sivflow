/**
 * Fetches and parses the PPTX manifest JSON from Firebase Storage.
 * Handles: AbortController, generation guard, retry loop for "not found yet",
 * fallback PDF URL resolution, and slide navigation boundary enforcement.
 */

import type { SlideData } from "@/components/pptx/SlideImage";
import {
  appendCacheBust,
  isHttpUrl,
  isWithinPendingWindow,
  manifestRetryDelayMs,
  normalizeString,
  waitFor,
} from "@/components/pptx/domain/pptxConversion";
import { isStorageObjectNotFound } from "@/components/pptx/domain/pptxErrors";
import type {
  PptxManifest,
  PptxManifestStatus,
} from "@/components/pptx/domain/pptxTypes";
import { storage } from "@/services/firebase";
import type { DocumentItem } from "@/types";
import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useRef, useState } from "react";

interface Options {
  docId: string | undefined;
  manifestStatus: PptxManifestStatus;
  manifestPath: string | null;
  manifestToken: string | number | undefined;
  fallbackPath: string | null;
  requestedAtMs: number | null;
  manifestPendingWindowMs: number;
  sourceSignature: string;
  isOnline: boolean;
  applyLocalDocumentPatch: (patch: Partial<DocumentItem>) => Promise<void>;
  logDiagnostics: (message: string, payload?: Record<string, unknown>) => void;
}

interface ManifestLoaderState {
  slides: SlideData[];
  slideCount: number;
  loadingManifest: boolean;
  manifestPending: boolean;
  manifestError: string | null;
  fallbackUrl: string | null;
}

const resolveStorageUrl = (pathOrUrl?: string | null) => {
  if (!pathOrUrl) return null;
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  return getDownloadURL(ref(storage, pathOrUrl));
};

export const usePptxManifestLoader = (
  {
    docId,
    manifestStatus,
    manifestPath,
    manifestToken,
    fallbackPath,
    requestedAtMs,
    manifestPendingWindowMs,
    sourceSignature,
    isOnline,
    applyLocalDocumentPatch,
    logDiagnostics,
  }: Options
) => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [slideCount, setSlideCount] = useState(0);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [manifestPending, setManifestPending] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const generationRef = useRef(0);

  // Fallback PDF URL resolution
  useEffect(() => {
    let cancelled = false;
    if (!fallbackPath) {
      setFallbackUrl(null);
      return;
    }

    resolveStorageUrl(fallbackPath)
      .then((url) => {
        if (cancelled) return;
        setFallbackUrl(url);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[usePptxManifestLoader] failed to resolve fallback PDF", {
          docId,
          fallbackPath,
          error,
        });
        setFallbackUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [docId, fallbackPath]);

  // Manifest fetch + retry loop
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const generation = generationRef.current + 1;
    generationRef.current = generation;

    const isStale = () =>
      cancelled ||
      controller.signal.aborted ||
      generationRef.current !== generation;

    if (manifestStatus !== "ready") {
      setLoadingManifest(false);
      setManifestPending(false);
      setManifestError(null);
      setSlides([]);
      setSlideCount(0);
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    if (!manifestPath) {
      setLoadingManifest(false);
      setManifestPending(false);
      setSlides([]);
      setSlideCount(0);
      setManifestError("manifest が見つかりません。再変換を試してください。");
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    const loadManifest = async () => {
      setLoadingManifest(true);
      setManifestPending(false);
      setManifestError(null);
      let attempt = 0;

      try {
        while (!cancelled) {
          try {
            const url = await resolveStorageUrl(manifestPath);
            if (!url) throw new Error("manifest URL not found");
            const manifestUrl = appendCacheBust(url, manifestToken);
            const res = await fetch(manifestUrl, {
              signal: controller.signal,
            });
            if (res.status === 404) {
              const err = new Error("manifest_not_found") as Error & {
                code?: string;
              };
              err.code = "manifest_not_found";
              throw err;
            }
            if (!res.ok)
              throw new Error(`manifest fetch failed: ${res.status}`);
            const json = (await res.json()) as PptxManifest;
            const slideList = (json.slides ?? [])
              .filter((slide) => Number.isFinite(slide.index))
              .map((slide) => ({
                index: slide.index,
                path: slide.path ?? null,
                url: slide.url ?? null,
                width: slide.width,
                height: slide.height,
              })) as SlideData[];
            slideList.sort((a, b) => a.index - b.index);

            if (isStale()) return;
            setManifestPending(false);
            setSlides(slideList);
            setSlideCount(json.slideCount ?? slideList.length ?? 0);
            return;
          } catch (error: unknown) {
            if (isStale()) return;

            const manifestNotFound = isStorageObjectNotFound(error);
            if (
              manifestNotFound &&
              isWithinPendingWindow(requestedAtMs, manifestPendingWindowMs)
            ) {
              const retryInMs = manifestRetryDelayMs(attempt);
              attempt += 1;
              setManifestPending(true);
              logDiagnostics("manifest-not-found-pending", {
                docId,
                manifestPath,
                retryInMs,
                attempt,
              });
              try {
                await waitFor(retryInMs, controller.signal);
              } catch {
                return;
              }
              if (isStale()) return;
              continue;
            }

            const message =
              error instanceof Error
                ? error.message
                : "manifest の読み込みに失敗しました";
            setManifestPending(false);
            setSlides([]);
            setSlideCount(0);
            setManifestError(
              isOnline
                ? manifestNotFound
                  ? "変換完了待機を超過しました。manifest が見つかりません。再試行してください。"
                  : message
                : "オフラインのため manifest を取得できません",
            );
            console.error("[usePptxManifestLoader] failed to load manifest", {
              docId,
              manifestPath,
              error,
            });
            if (manifestNotFound) {
              void applyLocalDocumentPatch({
                convertStatus: "failed",
                pptxManifestStatus: "failed",
                pptxLastError: "manifest_not_found",
                pptxRetryCount: 0,
                pptxNextRetryAt: null,
                pptxSourceSignature: sourceSignature,
                pptx: {
                  error: "manifest_not_found",
                  retryCount: 0,
                  nextRetryAt: null,
                  sourceSignature: normalizeString(sourceSignature),
                  updatedAt: new Date(),
                },
              });
            }
            return;
          }
        }
      } finally {
        if (!isStale()) {
          setLoadingManifest(false);
        }
      }
    };

    void loadManifest();

    return () => {
      generationRef.current = generation + 1;
      cancelled = true;
      controller.abort();
    };
  }, [
    applyLocalDocumentPatch,
    docId,
    isOnline,
    logDiagnostics,
    manifestPath,
    manifestPendingWindowMs,
    manifestStatus,
    manifestToken,
    requestedAtMs,
    sourceSignature,
  ]);

  return {
    slides,
    slideCount,
    loadingManifest,
    manifestPending,
    manifestError,
    fallbackUrl,
  };
};
