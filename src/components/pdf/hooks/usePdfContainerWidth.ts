/**
 * コンテナ幅を ResizeObserver で監視するフック。
 * containerRef を div に渡し、containerWidth を受け取る。
 */
import { useEffect, useRef, useState } from "react";

interface UsePdfContainerWidthResult {
  containerRef: React.RefObject<HTMLDivElement>;
  containerWidth: number;
}

export function usePdfContainerWidth(): UsePdfContainerWidthResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  return { containerRef, containerWidth };
}




