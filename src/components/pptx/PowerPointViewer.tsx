import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { SlideImage } from "./SlideImage";
import type { SlideData } from "./SlideImage";

export interface PowerPointViewerHandle {
  scrollToSlide: (index: number) => void;
}

interface PowerPointViewerProps {
  slides: SlideData[];
  scale: number;
  onSlideChange?: (index: number) => void;
  className?: string;
  pageGap?: number;
}

export const PowerPointViewer = React.forwardRef<
  PowerPointViewerHandle,
  PowerPointViewerProps
>(function PowerPointViewer(
  {
    slides,
    scale,
    onSlideChange,
    className,
    pageGap = 16,
  }: PowerPointViewerProps,
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollRootEl, setScrollRootEl] = useState<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const visibilityRatiosRef = useRef<Record<number, number>>({});

  const [wrapWidth, setWrapWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapWidth(el.clientWidth));
    ro.observe(el);
    setWrapWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    slideRefs.current = new Array(slides.length).fill(null);
    visibilityRatiosRef.current = {};
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [slides]);

  const scheduleSlideUpdate = useCallback(() => {
    if (!onSlideChange) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const entries = Object.entries(visibilityRatiosRef.current);
      if (entries.length === 0) return;
      let maxIndex = slides[0]?.index ?? 1;
      let maxRatio = -1;
      for (const [key, ratio] of entries) {
        const page = Number(key);
        if (!Number.isFinite(page) || !Number.isFinite(ratio)) continue;
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxIndex = page;
        }
      }
      if (maxRatio < 0.05) return;
      onSlideChange(maxIndex);
    });
  }, [onSlideChange, slides]);

  useEffect(() => {
    scheduleSlideUpdate();
  }, [wrapWidth, scale, scheduleSlideUpdate]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToSlide: (index: number) => {
        const container = scrollRef.current;
        if (!container) return;
        const clamped = Math.min(Math.max(index, 1), slides.length || 1);
        const target = slideRefs.current[clamped - 1];
        if (!target) return;
        container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      },
    }),
    [slides.length],
  );

  const paddingAllowance = 32;
  const chromeAllowance = 12;
  const availableWidth = Math.max(
    1,
    wrapWidth - paddingAllowance - chromeAllowance,
  );
  const renderWidth =
    Math.min(1800, Math.max(240, Math.floor(availableWidth))) * scale;

  return (
    <div
      ref={(el) => {
        scrollRef.current = el;
        setScrollRootEl((prev) => (prev === el ? prev : el));
      }}
      className={cn("h-full w-full overflow-auto bg-slate-50", className)}
    >
      <div className="p-4">
        <div ref={wrapRef} className="w-full min-w-0">
          <div className="flex flex-col" style={{ gap: `${pageGap}px` }}>
            {slides.map((slide, index) => (
              <SlideImage
                key={`slide-${slide.index}`}
                slide={slide}
                renderWidth={renderWidth}
                rootEl={scrollRootEl}
                onVisibilityChange={(pageNumber, ratio) => {
                  if (ratio < 0.05) {
                    delete visibilityRatiosRef.current[pageNumber];
                  } else {
                    visibilityRatiosRef.current[pageNumber] = ratio;
                  }
                  scheduleSlideUpdate();
                }}
                onContainerRef={(el) => {
                  slideRefs.current[index] = el;
                }}
                className="min-w-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});




