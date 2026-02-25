import React from 'react';

type RowSnapProps = {
  rowPx: number;
  children: (ctx: { snapPaddingBottomPx: number; snapRef: (node: HTMLElement | null) => void }) => React.ReactNode;
  afterGapRows?: number;
};

const EPSILON = 0.5;

export function RowSnap({ rowPx, children, afterGapRows = 0 }: RowSnapProps) {
  const targetRef = React.useRef<HTMLElement | null>(null);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const [snapPaddingBottomPx, setSnapPaddingBottomPx] = React.useState(0);
  const paddingRef = React.useRef(0);

  const safeRowPx = Math.max(1, rowPx);
  const gapPx = Math.max(0, Math.round(afterGapRows)) * safeRowPx;

  React.useEffect(() => {
    paddingRef.current = snapPaddingBottomPx;
  }, [snapPaddingBottomPx]);

  const scheduleMeasure = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const node = targetRef.current;
      if (!node) return;

      const measuredPxRaw = node.getBoundingClientRect().height - paddingRef.current;
      const measuredPx = Math.max(0, measuredPxRaw);
      const snapPx = Math.ceil(measuredPx / safeRowPx) * safeRowPx;
      const nextExtra = Math.max(0, snapPx - measuredPx) + gapPx;

      setSnapPaddingBottomPx((prev) =>
        Math.abs(prev - nextExtra) < EPSILON ? prev : nextExtra
      );
    });
  }, [gapPx, safeRowPx]);

  const setSnapRef = React.useCallback((node: HTMLElement | null) => {
    if (observerRef.current && targetRef.current) {
      observerRef.current.unobserve(targetRef.current);
    }

    targetRef.current = node;

    if (!node || typeof ResizeObserver === 'undefined') return;
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver(() => scheduleMeasure());
    }

    observerRef.current.observe(node);
    scheduleMeasure();
  }, [scheduleMeasure]);

  React.useLayoutEffect(() => {
    scheduleMeasure();
  }, [scheduleMeasure]);

  React.useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return <>{children({ snapPaddingBottomPx, snapRef: setSnapRef })}</>;
}
