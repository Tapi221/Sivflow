import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef } from "react";

export type ImmediateVirtualScrollRangeUpdateOptions = {
  sync?: boolean;
};

export type ImmediateVirtualScrollRangeOptions<TElement extends HTMLElement> = {
  updateRange: (element: TElement | null, options?: ImmediateVirtualScrollRangeUpdateOptions) => void;
  onDeferredScroll?: (