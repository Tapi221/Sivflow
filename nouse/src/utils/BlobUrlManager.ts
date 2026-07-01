const BlobUrlManager = class {
  private activeUrls = new Set<string>();
  private readonly MAX_ACTIVE_URLS = 20;

  create(blob: Blob): string {
    if (this.activeUrls.size >= this.MAX_ACTIVE_URLS) {
      console.warn(
        `[BlobUrlManager] URL の上限に達しました (${this.MAX_ACTIVE_URLS})。最も古い URL を解放します...`,
      );
      const oldest = this.activeUrls.values().next().value;
      if (oldest) {
        this.revoke(oldest);
      }
    }

    const url = URL.createObjectURL(blob);
    this.activeUrls.add(url);

    console.log(
      `[BlobUrlManager] 作成: ${url.substring(0, 50)}... (合計: ${this.activeUrls.size})`,
    );
    return url;
  }

  revoke(url: string): void {
    if (this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
      console.log(
        `[BlobUrlManager] 解放: ${url.substring(0, 50)}... (残り: ${this.activeUrls.size})`,
      );
    }
  }

  revokeAll(): void {
    for (const url of this.activeUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeUrls.clear();
    console.log("[BlobUrlManager] すべてのURLを解放しました");
  }

  getActiveCount(): number {
    return this.activeUrls.size;
  }
};
const blobUrlManager = new BlobUrlManager();



if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    blobUrlManager.revokeAll();
  });
}



export { blobUrlManager };
