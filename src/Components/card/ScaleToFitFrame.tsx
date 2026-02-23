import React from 'react';
import { cn } from '@/lib/utils';

export interface ScaleToFitFrameProps {
  children: React.ReactNode;
  className?: string;
  baseWidth?: number;
  scaleMultiplier?: number;
  disableScale?: boolean;
}

export function ScaleToFitFrame({
  children,
  className,
  baseWidth = 480,
  scaleMultiplier = 1,
  disableScale = false,
}: ScaleToFitFrameProps) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = React.useState(1);
  const [contentHeight, setContentHeight] = React.useState<number | null>(null);

  const rafIdRef = React.useRef<number | null>(null);
  const schedule = React.useCallback((fn: () => void) => {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      fn();
    });
  }, []);

  React.useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (disableScale) {
      setScale(1);
      return;
    }
    if (typeof ResizeObserver === 'undefined') return;
    if (!frameRef.current) return;

    const frame = frameRef.current;

    const calcScale = () => {
      const availableWidth = frame.clientWidth;
      if (!availableWidth) return;

      const safeBase = Math.max(1, baseWidth);
      const fitScale = Math.min(1, availableWidth / safeBase);
      const nextScale = Math.max(0.1, Math.min(1, fitScale * scaleMultiplier));

      setScale((prev) => (Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale));
    };

    calcScale();

    const observer = new ResizeObserver(() => schedule(calcScale));
    observer.observe(frame);

    return () => observer.disconnect();
  }, [baseWidth, scaleMultiplier, disableScale, schedule]);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    if (!contentRef.current) return;

    const content = contentRef.current;

    const updateHeight = () => {
      const h = content.getBoundingClientRect().height;
      const next = Math.max(0, Math.ceil(h));
      setContentHeight((prev) => (prev === next ? prev : next));
    };

    updateHeight();

    const observer = new ResizeObserver(() => schedule(updateHeight));
    observer.observe(content);

    return () => observer.disconnect();
  }, [schedule]);

  const scaledHeight =
    contentHeight != null ? Math.ceil(contentHeight * (disableScale ? 1 : scale)) : null;

  return (
    <div
      ref={frameRef}
      className={cn('w-full overflow-x-hidden', className)}
      style={scaledHeight != null ? { height: `${scaledHeight}px` } : undefined}
    >
      <div
        className="mx-auto"
        style={{
          width: disableScale ? '100%' : `${Math.max(1, baseWidth)}px`,
          transform: disableScale ? 'none' : `scale(${scale})`,
          transformOrigin: disableScale ? 'initial' : 'top center',
          willChange: disableScale ? undefined : 'transform',
        }}
      >
        <div ref={contentRef} className="flow-root">
          {children}
        </div>
      </div>
    </div>
  );
}
