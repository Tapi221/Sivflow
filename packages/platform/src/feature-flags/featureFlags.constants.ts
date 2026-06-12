type FeatureFlags = {
  newEditor: boolean;
  enableMarkdownImages: boolean;
  experimentalPasteSplit: boolean;
  postReviewPractice: boolean;
  enableAdvancedTelemetry: boolean;
};
type LegacyFlagName = "postReviewPractice" | "ENABLE_ADVANCED_TELEMETRY";



const DEFAULT_FEATURE_FLAGS: FeatureFlags = { newEditor: false, enableMarkdownImages: false, experimentalPasteSplit: false, postReviewPractice: false, enableAdvancedTelemetry: false };
const LEGACY_FEATURE_FLAG_MAP: Record<LegacyFlagName, keyof FeatureFlags> = { postReviewPractice: "postReviewPractice", ENABLE_ADVANCED_TELEMETRY: "enableAdvancedTelemetry" };



export { DEFAULT_FEATURE_FLAGS, LEGACY_FEATURE_FLAG_MAP };


export type { FeatureFlags, LegacyFlagName };
