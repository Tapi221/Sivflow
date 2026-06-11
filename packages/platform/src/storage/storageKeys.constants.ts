const SHARED_STORAGE_KEYS = { featureFlags: "FEATURE_FLAGS", deviceId: "deviceId", cardZoomPreferences: "card-zoom-preferences", cardSetViewZoomPreferences: "sivflow:cardsetview-zoom-preferences:v2", cardSetViewZoomPreferencesLegacy: ["flashcard-master:cardsetview-zoom-preferences:v2", "cardsetview-zoom-preferences", "card-view-zoom-preferences"], cardLayoutModePrefix: "sivflow:card-layout-mode", cardLayoutModePrefixLegacy: "flashcard-master:card-layout-mode", cardSetViewFlippedFacePrefix: "sivflow:cardsetview-flipped-face", cardSetViewFlippedFacePrefixLegacy: "flashcard-master:cardsetview-flipped-face", cardLayoutSplitFallback: "sivflow:card-layout-split-fallback", cardLayoutSplitFallbackLegacy: "flashcard-master:card-layout-split-fallback", cardWidthPreferences: "card-width-preferences" } as const;



export { SHARED_STORAGE_KEYS };
