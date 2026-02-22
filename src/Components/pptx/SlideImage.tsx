import React, { useEffect, useRef, useState } from 'react';
import { ref, getDownloadURL } from 'firebase/storage'; // IDE Check: firebase/storage
import { storage } from '@/services/firebase';
import { cn } from '@/lib/utils';

export interface SlideData {
  index: number;
  path?: string | null;
  url?: string | null;
  width: number;
  height: number;
}

interface SlideImageProps {
  slide: SlideData;
  renderWidth: number;
  rootEl: HTMLDivElement | null;
  onVisibilityChange?: (index: number, ratio: number) => void;
  onContainerRef?: (el: HTMLDivElement | null) => void;
  className?: string;
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const DEFAULT_RATIO = 9 / 16;
const MAX_CONCURRENT = 6;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];
const urlCache = new Map<string, string>();
const pendingCache = new Map<string, Promise<string>>();

const runNext = () => {
  if (activeRequests >= MAX_CONCURRENT) return;
  const job = requestQueue.shift();
  if (!job) return;
  activeRequests += 1;
  job();
};

const enqueue = <T,>(task: () => Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const runner = () => {
      task()
        .then(resolve, reject)
        .finally(() => {
          activeRequests -= 1;
          runNext();
        });
    };
    requestQueue.push(runner);
    runNext();
  });

const resolveSlideUrl = async (pathOrUrl: string): Promise<string> => {
  if (urlCache.has(pathOrUrl)) return urlCache.get(pathOrUrl)!;
  if (pendingCache.has(pathOrUrl)) return pendingCache.get(pathOrUrl)!;

  const promise = enqueue(async () => {
    const resolved = isHttpUrl(pathOrUrl)
      ? pathOrUrl
      : await getDownloadURL(ref(storage, pathOrUrl));
    urlCache.set(pathOrUrl, resolved);
    return resolved;
  });

  pendingCache.set(pathOrUrl, promise);
  try {
    return await promise;
  } finally {
    pendingCache.delete(pathOrUrl);
  }
};

export function SlideImage({ slide, renderWidth, rootEl, onVisibilityChange, onContainerRef, className }: SlideImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [src, setSrc] = useState<string | null>(slide.url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    onContainerRef?.(containerRef.current);
    return () => onContainerRef?.(null);
  }, [onContainerRef]);

  useEffect(() => {
    setSrc(slide.url ?? null);
    setError(null);
    setRequested(false);
    setShouldLoad(false);
  }, [slide.url, slide.path, slide.index]);

  useEffect(() => {
    const target = containerRef.current;
    if (!rootEl || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        onVisibilityChange?.(slide.index, entry.intersectionRatio);
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setShouldLoad(true);
        }
      },
      {
        root: rootEl,
        rootMargin: '800px 0px',
        threshold: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rootEl, slide.index, onVisibilityChange]);

  useEffect(() => {
    if (!shouldLoad || src || requested) return;
    if (slide.url) {
      setSrc(slide.url);
      return;
    }
    if (!slide.path) {
      setError('スライドのURLがありません');
      return;
    }

    let cancelled = false;
    setRequested(true);

    const load = async () => {
      try {
        const resolved = await resolveSlideUrl(slide.path!);
        if (!cancelled) setSrc(resolved);
      } catch (err) {
        if (!cancelled) {
          console.error('[SlideImage] failed to resolve slide url', err);
          setError('スライドの読み込みに失敗しました');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [shouldLoad, src, requested, slide.path, slide.url]);

  const ratio = slide.width > 0 && slide.height > 0 ? slide.height / slide.width : DEFAULT_RATIO;
  const renderHeight = Math.max(1, Math.floor(renderWidth * ratio));

  return (
    <div
      ref={containerRef}
      className={cn('w-full flex justify-center', className)}
      style={{ minHeight: `${renderHeight}px` }}
    >
      <div className="inline-block bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {!src && !error && (
          <div className="text-xs text-slate-400 px-3 py-2">読み込み中...</div>
        )}
        {error && (
          <div className="text-xs text-rose-500 px-3 py-2">{error}</div>
        )}
        {src && (
          <img
            src={src}
            alt={`Slide ${slide.index}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="block"
            style={{ width: `${renderWidth}px`, height: `${renderHeight}px` }}
            onError={() => setError('スライド画像の読み込みに失敗しました')}
          />
        )}
      </div>
    </div>
  );
}
