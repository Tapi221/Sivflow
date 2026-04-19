import type { PageSize } from "@/components/pdf/pdfViewerTypes";

export interface PdfRenderBackingStoreConstraints {
  readonly maxPreferredDevicePixelRatio: number;
  readonly maxCanvasPixels: number;
  readonly maxCanvasEdgePx: number;
}

export interface ResolvePdfRenderBackingStoreArgs {
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly devicePixelRatio: number | null | undefined;
  readonly constraints?: Partial<PdfRenderBackingStoreConstraints>;
}

export interface PdfRenderBackingStore {
  readonly devicePixelRatio: number;
  readonly canvasWidthPx: number;
  readonly canvasHeightPx: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

const DEFAULT_CONSTRAINTS: PdfRenderBackingStoreConstraints = {
  maxPreferredDevicePixelRatio: 4,
  maxCanvasPixels: 16_777_216,
  maxCanvasEdgePx: 8192,
};

const normalizePositiveFinite = (value: number | null | undefined, fallback: number) => {
  if (typeof value !== "number") {
    return fallback;
  }

  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const floorCanvasLength = (value: number) => {
  return Math.max(1, Math.floor(value));
};

const resolveEffectiveConstraints = (
  constraints?: Partial<PdfRenderBackingStoreConstraints>,
): PdfRenderBackingStoreConstraints => {
  return {
    maxPreferredDevicePixelRatio: normalizePositiveFinite(
      constraints?.maxPreferredDevicePixelRatio,
      DEFAULT_CONSTRAINTS.maxPreferredDevicePixelRatio,
    ),
    maxCanvasPixels: normalizePositiveFinite(
      constraints?.maxCanvasPixels,
      DEFAULT_CONSTRAINTS.maxCanvasPixels,
    ),
    maxCanvasEdgePx: normalizePositiveFinite(
      constraints?.maxCanvasEdgePx,
      DEFAULT_CONSTRAINTS.maxCanvasEdgePx,
    ),
  };
};

const resolveScaleLimitByEdge = ({
  viewportWidthPx,
  viewportHeightPx,
  maxCanvasEdgePx,
}: {
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly maxCanvasEdgePx: number;
}) => {
  const maxWidthScale = maxCanvasEdgePx / viewportWidthPx;
  const maxHeightScale = maxCanvasEdgePx / viewportHeightPx;

  return Math.max(1, Math.min(maxWidthScale, maxHeightScale));
};

const resolveScaleLimitByArea = ({
  viewportWidthPx,
  viewportHeightPx,
  maxCanvasPixels,
}: {
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly maxCanvasPixels: number;
}) => {
  const currentViewportPixels = viewportWidthPx * viewportHeightPx;
  if (!Number.isFinite(currentViewportPixels) || currentViewportPixels <= 0) {
    return 1;
  }

  if (currentViewportPixels >= maxCanvasPixels) {
    return 1;
  }

  return Math.max(1, Math.sqrt(maxCanvasPixels / currentViewportPixels));
};

export const resolvePdfRenderBackingStore = ({
  viewportWidthPx,
  viewportHeightPx,
  devicePixelRatio,
  constraints,
}: ResolvePdfRenderBackingStoreArgs): PdfRenderBackingStore => {
  const safeViewportWidthPx = normalizePositiveFinite(viewportWidthPx, 1);
  const safeViewportHeightPx = normalizePositiveFinite(viewportHeightPx, 1);
  const safeDevicePixelRatio = clamp(
    normalizePositiveFinite(devicePixelRatio, 1),
    1,
    resolveEffectiveConstraints(constraints).maxPreferredDevicePixelRatio,
  );
  const effectiveConstraints = resolveEffectiveConstraints(constraints);

  const scaleLimitByEdge = resolveScaleLimitByEdge({
    viewportWidthPx: safeViewportWidthPx,
    viewportHeightPx: safeViewportHeightPx,
    maxCanvasEdgePx: effectiveConstraints.maxCanvasEdgePx,
  });
  const scaleLimitByArea = resolveScaleLimitByArea({
    viewportWidthPx: safeViewportWidthPx,
    viewportHeightPx: safeViewportHeightPx,
    maxCanvasPixels: effectiveConstraints.maxCanvasPixels,
  });

  const effectiveDevicePixelRatio = Math.max(
    1,
    Math.min(safeDevicePixelRatio, scaleLimitByEdge, scaleLimitByArea),
  );

  const canvasWidthPx = floorCanvasLength(
    safeViewportWidthPx * effectiveDevicePixelRatio,
  );
  const canvasHeightPx = floorCanvasLength(
    safeViewportHeightPx * effectiveDevicePixelRatio,
  );

  return {
    devicePixelRatio: effectiveDevicePixelRatio,
    canvasWidthPx,
    canvasHeightPx,
    scaleX: canvasWidthPx / safeViewportWidthPx,
    scaleY: canvasHeightPx / safeViewportHeightPx,
  };
};

export const buildPdfRenderBackingStoreForPageSize = ({
  size,
  scale,
  devicePixelRatio,
  constraints,
}: {
  readonly size: PageSize;
  readonly scale: number;
  readonly devicePixelRatio: number | null | undefined;
  readonly constraints?: Partial<PdfRenderBackingStoreConstraints>;
}) => {
  const safeScale = normalizePositiveFinite(scale, 1);

  return resolvePdfRenderBackingStore({
    viewportWidthPx: size.width * safeScale,
    viewportHeightPx: size.height * safeScale,
    devicePixelRatio,
    constraints,
  });
};
