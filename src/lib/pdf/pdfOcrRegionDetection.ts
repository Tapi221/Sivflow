export interface PdfOcrCanvasRegion {
  id: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  darkPixelRatio: number;
  canvas: HTMLCanvasElement;
}

export interface SegmentCanvasIntoTextRegionsOptions {
  maxRegions?: number;
  minRowInkRatio?: number;
  minColumnInkRatio?: number;
  minRegionHeightPx?: number;
  minRegionWidthPx?: number;
  maxMergeGapPx?: number;
  darkThreshold?: number;
}

type Band = {
  start: number;
  end: number;
};

const DEFAULT_MAX_REGIONS = 8;
const DEFAULT_MIN_ROW_INK_RATIO = 0.018;
const DEFAULT_MIN_COLUMN_INK_RATIO = 0.022;
const DEFAULT_MIN_REGION_HEIGHT_PX = 28;
const DEFAULT_MIN_REGION_WIDTH_PX = 48;
const DEFAULT_MAX_MERGE_GAP_PX = 10;
const DEFAULT_DARK_THRESHOLD = 228;

const buildBands = ({
  values,
  limit,
  minLength,
  maxMergeGap,
}: {
  values: boolean[];
  limit: number;
  minLength: number;
  maxMergeGap: number;
}) => {
  const bands: Band[] = [];
  let currentStart: number | null = null;

  values.forEach((isActive, index) => {
    if (isActive && currentStart === null) {
      currentStart = index;
      return;
    }

    if (!isActive && currentStart !== null) {
      bands.push({ start: currentStart, end: index - 1 });
      currentStart = null;
    }
  });

  if (currentStart !== null) {
    bands.push({ start: currentStart, end: values.length - 1 });
  }

  const mergedBands: Band[] = [];
  bands.forEach((band) => {
    const previousBand = mergedBands.at(-1);
    if (
      previousBand &&
      band.start - previousBand.end - 1 <= maxMergeGap
    ) {
      previousBand.end = band.end;
      return;
    }

    mergedBands.push({ ...band });
  });

  return mergedBands
    .filter((band) => band.end - band.start + 1 >= minLength)
    .slice(0, limit);
};

const cropCanvas = ({
  sourceCanvas,
  x,
  y,
  width,
  height,
}: {
  sourceCanvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return canvas;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    sourceCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas;
};

export const segmentCanvasIntoTextRegions = ({
  canvas,
  maxRegions = DEFAULT_MAX_REGIONS,
  minRowInkRatio = DEFAULT_MIN_ROW_INK_RATIO,
  minColumnInkRatio = DEFAULT_MIN_COLUMN_INK_RATIO,
  minRegionHeightPx = DEFAULT_MIN_REGION_HEIGHT_PX,
  minRegionWidthPx = DEFAULT_MIN_REGION_WIDTH_PX,
  maxMergeGapPx = DEFAULT_MAX_MERGE_GAP_PX,
  darkThreshold = DEFAULT_DARK_THRESHOLD,
}: {
  canvas: HTMLCanvasElement;
} & SegmentCanvasIntoTextRegionsOptions): PdfOcrCanvasRegion[] => {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || canvas.width <= 0 || canvas.height <= 0) {
    return [];
  }

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  const rowInkCounts = new Array<number>(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = data[offset] ?? 255;
      if (value < darkThreshold) {
        rowInkCounts[y] += 1;
      }
    }
  }

  const rowBands = buildBands({
    values: rowInkCounts.map((count) => count / Math.max(width, 1) >= minRowInkRatio),
    limit: maxRegions * 2,
    minLength: minRegionHeightPx,
    maxMergeGap: maxMergeGapPx,
  });

  const regions: PdfOcrCanvasRegion[] = [];

  rowBands.forEach((rowBand) => {
    const columnValues = new Array<boolean>(width).fill(false);

    for (let x = 0; x < width; x += 1) {
      let darkCount = 0;
      for (let y = rowBand.start; y <= rowBand.end; y += 1) {
        const offset = (y * width + x) * 4;
        const value = data[offset] ?? 255;
        if (value < darkThreshold) {
          darkCount += 1;
        }
      }

      const bandHeight = Math.max(1, rowBand.end - rowBand.start + 1);
      columnValues[x] = darkCount / bandHeight >= minColumnInkRatio;
    }

    const columnBands = buildBands({
      values: columnValues,
      limit: maxRegions,
      minLength: minRegionWidthPx,
      maxMergeGap: Math.max(4, Math.floor(maxMergeGapPx / 2)),
    });

    if (columnBands.length === 0) {
      const bandWidth = width;
      const bandHeight = rowBand.end - rowBand.start + 1;
      const darkPixels = rowInkCounts
        .slice(rowBand.start, rowBand.end + 1)
        .reduce((sum, count) => sum + count, 0);

      regions.push({
        id: `region-${regions.length}`,
        order: regions.length,
        x: 0,
        y: rowBand.start,
        width: bandWidth,
        height: bandHeight,
        darkPixelRatio:
          darkPixels / Math.max(1, bandWidth * bandHeight),
        canvas: cropCanvas({
          sourceCanvas: canvas,
          x: 0,
          y: rowBand.start,
          width: bandWidth,
          height: bandHeight,
        }),
      });

      return;
    }

    columnBands.forEach((columnBand) => {
      const regionWidth = columnBand.end - columnBand.start + 1;
      const regionHeight = rowBand.end - rowBand.start + 1;
      let darkPixels = 0;

      for (let y = rowBand.start; y <= rowBand.end; y += 1) {
        for (let x = columnBand.start; x <= columnBand.end; x += 1) {
          const offset = (y * width + x) * 4;
          const value = data[offset] ?? 255;
          if (value < darkThreshold) {
            darkPixels += 1;
          }
        }
      }

      regions.push({
        id: `region-${regions.length}`,
        order: regions.length,
        x: columnBand.start,
        y: rowBand.start,
        width: regionWidth,
        height: regionHeight,
        darkPixelRatio:
          darkPixels / Math.max(1, regionWidth * regionHeight),
        canvas: cropCanvas({
          sourceCanvas: canvas,
          x: columnBand.start,
          y: rowBand.start,
          width: regionWidth,
          height: regionHeight,
        }),
      });
    });
  });

  return regions
    .sort((left, right) => {
      if (left.y !== right.y) {
        return left.y - right.y;
      }

      return left.x - right.x;
    })
    .slice(0, maxRegions)
    .map((region, index) => ({
      ...region,
      order: index,
      id: `region-${index}`,
    }));
};
