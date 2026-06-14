const BlobUrlManager = class {
  private activeUrls = new Set<string>();
  private readonly MAX_ACTIVE_URLS = 20;

  create(blob: Blob): string {
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

  revoke(url: string): void {
    if (this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
      console.log(
        `[BlobUrlManager] Revoked: ${url.substring(0, 50)}... (Remaining: ${this.activeUrls.size})`,
      );
    }
  }

  revokeAll(): void {
    for (const url of this.activeUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeUrls.clear();
    console.log("[BlobUrlManager] All URLs revoked");
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
