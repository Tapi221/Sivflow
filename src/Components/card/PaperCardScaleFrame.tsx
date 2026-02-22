import React from 'react';
import { cn } from '@/lib/utils';

interface PaperCardScaleFrameProps {
  children: React.ReactNode;
  className?: string;
  baseWidth?: number;
  scaleMultiplier?: number;
  disableScale?: boolean;
}

export function PaperCardScaleFrame({
  children,
  className,
  baseWidth = 480,
  scaleMultiplier = 1,
  disableScale = false,
}: PaperCardScaleFrameProps) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);
  const [contentHeight, setContentHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (disableScale) {
      setScale(1);
      return;
    }
    if (typeof ResizeObserver === 'undefined') return;
    if (!frameRef.current) return;

    const frame = frameRef.current;
    const updateScale = () => {
      const availableWidth = frame.clientWidth;
      if (!availableWidth) return;
      const fitScale = Math.min(1, availableWidth / baseWidth);
      const nextScale = Math.max(0.1, Math.min(1, fitScale * scaleMultiplier));
      setScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);

    return () => observer.disconnect();
  }, [baseWidth, scaleMultiplier, disableScale]);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    if (!contentRef.current) return;

    const content = contentRef.current;
    const updateHeight = () => setContentHeight(content.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={cn('w-full overflow-x-clip', className)}
      style={contentHeight != null ? { height: `${contentHeight * scale}px` } : undefined}
    >
      <div
        className="mx-auto"
        style={{
          width: disableScale ? '100%' : `${baseWidth}px`,
          transform: disableScale ? 'none' : `scale(${scale})`,
          transformOrigin: disableScale ? 'initial' : 'top center',
        }}
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
