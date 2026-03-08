/**
 * Blob URL のライフサイクル管理
 * Safari/iOS のメモリ制限に対応
 */
class BlobUrlManager {
  private activeUrls = new Set<string>();
  private readonly MAX_ACTIVE_URLS = 20; // Safari/iOS の制限を考慮

  /**
   * Blob URL を生成（上限管理付き）
   */
  create(blob: Blob): string {
    // 上限チェック
    if (this.activeUrls.size >= this.MAX_ACTIVE_URLS) {
      console.warn(
        `[BlobUrlManager] Max URLs reached (${this.MAX_ACTIVE_URLS}). Revoking oldest...`,
      );
      const oldest = this.activeUrls.values().next().value;
      if (oldest) {
        this.revoke(oldest);
      }
    }

    const url = URL.createObjectURL(blob);
    this.activeUrls.add(url);

    console.log(
      `[BlobUrlManager] Created: ${url.substring(0, 50)}... (Total: ${this.activeUrls.size})`,
    );
    return url;
  }

  /**
   * Blob URL を解放
   */
  revoke(url: string): void {
    if (this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
      console.log(
        `[BlobUrlManager] Revoked: ${url.substring(0, 50)}... (Remaining: ${this.activeUrls.size})`,
      );
    }
  }

  /**
   * すべての Blob URL を解放（クリーンアップ）
   */
  revokeAll(): void {
    for (const url of this.activeUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeUrls.clear();
    console.log("[BlobUrlManager] All URLs revoked");
  }

  /**
   * 現在のアクティブURL数を取得
   */
  getActiveCount(): number {
    return this.activeUrls.size;
  }
}

/**
 * Blob URL 管理の統一インスタンス
 */
export const blobUrlManager = new BlobUrlManager();

// アプリ終了時にクリーンアップ
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    blobUrlManager.revokeAll();
  });
}



