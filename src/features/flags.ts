import {
  DEFAULT_FEATURE_FLAGS,
  LEGACY_FEATURE_FLAG_MAP,
  type FeatureFlags,
  type LegacyFlagName,
} from "@constants/shared/featureFlags";
import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";

class FeatureFlagService {
  private flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

  constructor() {
    this.loadOverrides();
  }

  private loadOverrides = () => {
    if (typeof window === "undefined") return;
    if (!import.meta.env.DEV) return;

    try {
      const raw = localStorage.getItem(SHARED_STORAGE_KEYS.featureFlags);
      if (!raw) return;

      const parsed: unknown = JSON.parse(raw);
      if (parsed == null || typeof parsed !== "object") return;

      const obj = parsed as Record<string, unknown>;

      for (const key of Object.keys(obj) as (keyof FeatureFlags)[]) {
        const value = obj[key as unknown as string];
        if (key in this.flags && typeof value === "boolean") {
          this.flags[key] = value;
        }
      }
    } catch (err) {
      console.warn("[FeatureFlags] Failed to load overrides:", err);
    }
  };

  public getFlag = (flag: keyof FeatureFlags): boolean => {
    return this.flags[flag];
  };

  public setFlag = (flag: keyof FeatureFlags, value: boolean) => {
    this.flags[flag] = value;

    if (import.meta.env.DEV && typeof window !== "undefined") {
      try {
        const raw =
          localStorage.getItem(SHARED_STORAGE_KEYS.featureFlags) || "{}";
        const parsed: unknown = JSON.parse(raw);
        const current: Record<string, unknown> =
          parsed != null && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : {};

        current[flag] = value;
        localStorage.setItem(
          SHARED_STORAGE_KEYS.featureFlags,
          JSON.stringify(current),
        );
      } catch (err) {
        console.warn("[FeatureFlags] Failed to persist override:", err);
      }
    }
  };

  public resetToDefaults = () => {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };

    if (import.meta.env.DEV && typeof window !== "undefined") {
      localStorage.removeItem(SHARED_STORAGE_KEYS.featureFlags);
    }
  };

  public getAll = (): FeatureFlags => {
    return { ...this.flags };
  };
}

const featureFlags = new FeatureFlagService();

export const flags = {
  isEnabled: (name: LegacyFlagName): boolean => {
    return featureFlags.getFlag(LEGACY_FEATURE_FLAG_MAP[name]);
  },
};
