// src/features/flags.ts

export type FeatureFlags = {
  newEditor: boolean;
  enableMarkdownImages: boolean;
  experimentalPasteSplit: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  newEditor: false,
  enableMarkdownImages: false,
  experimentalPasteSplit: false,
};

class FeatureFlagService {
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };

  constructor() {
    this.loadOverrides();
  }

  /**
   * 開発環境のみ localStorage から override を読み込む
   * 本番では完全に無視（安全優先）
   */
  private loadOverrides() {
    if (typeof window === 'undefined') return;
    if (!import.meta.env.DEV) return;

    try {
      const raw = localStorage.getItem('FEATURE_FLAGS');
      if (!raw) return;

      const parsed = JSON.parse(raw);

      for (const key of Object.keys(parsed) as (keyof FeatureFlags)[]) {
        if (key in this.flags && typeof parsed[key] === 'boolean') {
          this.flags[key] = parsed[key];
        }
      }
    } catch (err) {
      console.warn('[FeatureFlags] Failed to load overrides:', err);
    }
  }

  public getFlag(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  /**
   * 開発環境のみ localStorage に保存
   * 本番ではメモリ上のみ変更
   */
  public setFlag(flag: keyof FeatureFlags, value: boolean) {
    this.flags[flag] = value;

    if (import.meta.env.DEV && typeof window !== 'undefined') {
      try {
        const current = JSON.parse(
          localStorage.getItem('FEATURE_FLAGS') || '{}'
        );
        current[flag] = value;
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(current));
      } catch (err) {
        console.warn('[FeatureFlags] Failed to persist override:', err);
      }
    }
  }

  /**
   * 本番では常に DEFAULT を使う
   */
  public resetToDefaults() {
    this.flags = { ...DEFAULT_FLAGS };

    if (import.meta.env.DEV && typeof window !== 'undefined') {
      localStorage.removeItem('FEATURE_FLAGS');
    }
  }

  public getAll(): FeatureFlags {
    return { ...this.flags };
  }
}

export const featureFlags = new FeatureFlagService();