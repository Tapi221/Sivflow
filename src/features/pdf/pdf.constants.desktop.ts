//viewer
export const PDF_PAGE_RENDER_OVERSCAN_VIEWPORTS = 1.25;
export const PDF_PAGE_PREFETCH_OVERSCAN_VIEWPORTS = 2.25;
export const PDF_PAGE_PREFETCH_EXTRA_PAGES = 1;
export const PDF_PAGE_PLACEHOLDER_FALLBACK_HEIGHT = 200;

//viewerstate
export const FIT_MIN_SCALE = 0.5;
export const FIT_MAX_SCALE = 3.0;
export const ZOOM_STEP = 0.1;
export const FIT_PADDING_X = 24;
export const EPSILON = 0.001;
export const VIEWER_STATE_DEBOUNCE_MS = 800;

export const PDF_BAR_MIN_PERCENT = 0;
export const PDF_BAR_MAX_PERCENT = 100;
export const PDF_BAR_MIN_RENDER_RATIO = 0.2;
export const PDF_BAR_MAX_RENDER_RATIO = 1;

export const PDF_GESTURE_MIN_SCALE = 1;
export const PDF_GESTURE_MAX_SCALE = 4;
export const PDF_GESTURE_WHEEL_ZOOM_INTENSITY = 0.0025;

//zoom
export const PDF_DOUBLE_PAGE_GAP = 16;
export const PDF_ZOOM_UI_MIN_PERCENT = 0;
export const PDF_ZOOM_UI_MAX_PERCENT = 100;
export const PDF_ZOOM_UI_RANGE_PERCENT =
  PDF_ZOOM_UI_MAX_PERCENT - PDF_ZOOM_UI_MIN_PERCENT;
export const PDF_SCALE_RANGE = FIT_MAX_SCALE - FIT_MIN_SCALE;
