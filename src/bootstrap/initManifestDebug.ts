let started = false;

export const initManifestDebug = () => {
  if (started || !import.meta.env.DEV || typeof window === "undefined") return;
  started = true;

  void fetch("/manifest.webmanifest")
    .then(async (res) => {
      const text = await res.text();

      console.log("[Manifest Debug] Status:", res.status);
      console.log(
        "[Manifest Debug] Content-Type:",
        res.headers.get("content-type"),
      );
      console.log("[Manifest Debug] First 100 chars:", text.substring(0, 100));

      if (!text.trim().startsWith("{")) {
        console.error(
          "[Manifest Debug] Manifest is NOT JSON! Got HTML or other format.",
        );
        return;
      }

      console.log("[Manifest Debug] Manifest appears to be valid JSON");
    })
    .catch((error) => {
      console.error("[Manifest Debug] Failed to fetch manifest:", error);
    });
};
