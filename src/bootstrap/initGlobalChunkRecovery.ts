import { BOOTSTRAP_RELOAD_KEYS } from "./constants";
import { isChunkLoadError, toErrorText } from "./errorUtils";
import { logBootstrapFault } from "./logBootstrapFault";
import { hardReloadOnce } from "./reloadGuard";

let started = false;

export const initGlobalChunkRecovery = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener(
    "error",
    (event) => {
      const errorEvent = event as ErrorEvent;
      const target = event.target as HTMLScriptElement | null;
      const hasAssetScriptTarget = Boolean(
        target?.src && target.src.includes("/assets/"),
      );
      const message = [errorEvent.message, errorEvent.error, target?.src]
        .filter(Boolean)
        .map(toErrorText)
        .join(" ");

      if (!isChunkLoadError(message) && !hasAssetScriptTarget) return;

      logBootstrapFault("window.error", {
        message,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno,
      });

      hardReloadOnce(BOOTSTRAP_RELOAD_KEYS.chunk);
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = toErrorText(event.reason);
    if (!isChunkLoadError(reason)) return;

    logBootstrapFault("window.unhandledrejection", { reason });
    hardReloadOnce(BOOTSTRAP_RELOAD_KEYS.chunk);
  });

  window.addEventListener("vite:preloadError", (event) => {
    const payload =
      "payload" in event ? (event as Event & { payload?: unknown }).payload : undefined;
    logBootstrapFault("vite.preloadError", {
      type: event.type,
      message: toErrorText(payload),
    });
    hardReloadOnce(BOOTSTRAP_RELOAD_KEYS.vitePreload);
  });
};
