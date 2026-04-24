export const SHARED_STORAGE_KEYS = {
  featureFlags: "FEATURE_FLAGS",
  deviceId: "deviceId",
  cardZoomPreferences: "card-zoom-preferences",
  cardSetViewZoomPreferences:
    "flashcard-master:cardsetview-zoom-preferences:v2",
  cardSetViewZoomPreferencesLegacy: [
    "cardsetview-zoom-preferences",
    "card-view-zoom-preferences",
  ],
  cardLayoutModePrefix: "flashcard-master:card-layout-mode",
  cardSetViewFlippedFacePrefix: "flashcard-master:cardsetview-flipped-face",
  cardLayoutSplitFallback: "flashcard-master:card-layout-split-fallback",
  cardWidthPreferences: "card-width-preferences",
} as const;
