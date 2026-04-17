export type FeatureFlags = {
  newEditor: boolean;
  enableMarkdownImages: boolean;
  experimentalPasteSplit: boolean;
  postReviewPractice: boolean;
  enableAdvancedTelemetry: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  newEditor: false,
  enableMarkdownImages: false,
  experimentalPasteSplit: false,
  postReviewPractice: false,
  enableAdvancedTelemetry: false,
};

export type LegacyFlagName = "postReviewPractice" | "ENABLE_ADVANCED_TELEMETRY";

export const LEGACY_FEATURE_FLAG_MAP: Record<LegacyFlagName, keyof FeatureFlags> = {
  postReviewPractice: "postReviewPractice",
  ENABLE_ADVANCED_TELEMETRY: "enableAdvancedTelemetry",
};
