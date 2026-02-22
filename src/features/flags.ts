/**
 * Feature Flags Management
 * 段階的ロールアウトやA/Bテストのためのフラグ管理
 */

export interface FeatureFlags {
  USE_SYNC_V2: boolean;
  ENABLE_ADVANCED_TELEMETRY: boolean;
  ENABLE_BACKGROUND_SYNC: boolean;
  postReviewPractice: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  USE_SYNC_V2: true, // Phase 2ロールアウト開始
  ENABLE_ADVANCED_TELEMETRY: true,
  ENABLE_BACKGROUND_SYNC: true, // バックグラウンド同期を有効化
  postReviewPractice: true,
};

export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;

  private constructor() {
    this.flags = { ...DEFAULT_FLAGS };
    this.loadOverrides();
  }

  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * フラグの値を取得
   */
  public isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  /**
   * ローカルストレージからのオーバーライドを読み込む
   * (開発者用ツールや特定ユーザーへの配信で使用)
   */
  private loadOverrides() {
    if (typeof window === 'undefined') return;

    try {
      const overrides = localStorage.getItem('FEATURE_FLAGS');
      if (overrides) {
        const parsed = JSON.parse(overrides);
        this.flags = { ...this.flags, ...parsed };
        console.log('[FeatureFlags] Loaded overrides:', parsed);
      }
    } catch (e) {
      console.error('[FeatureFlags] Failed to load overrides', e);
    }
  }

  /**
   * フラグを動的に設定 (ロールアウト率に基づく判定などに使用)
   */
  public setFlag(flag: keyof FeatureFlags, value: boolean) {
    this.flags[flag] = value;
    
    // 永続化も更新
    if (typeof window !== 'undefined') {
        const current = JSON.parse(localStorage.getItem('FEATURE_FLAGS') || '{}');
        current[flag] = value;
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(current));
    }
  }
}

export const flags = FeatureFlagManager.getInstance();
