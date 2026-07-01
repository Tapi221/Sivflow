import { RUNTIME_RELOAD_KEYS } from "@platform/runtime/runtime.constants";
import { logRuntimeFault } from "@web/runtime/logRuntimeFault";
import { hardReloadOnce } from "@web/runtime/reloadGuard";
import { isChunkLoadError, toErrorText } from "@web/runtime/runtimeErrorUtils";



let started = false;



const initGlobalChunkRecovery = () => {
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

      logRuntimeFault("window.error", {
        message,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno,
      });

      hardReloadOnce(RUNTIME_RELOAD_KEYS.chunk);
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = toErrorText(event.reason);
    if (!isChunkLoadError(reason)) return;

    logRuntimeFault("window.unhandledrejection", { reason });
    hardReloadOnce(RUNTIME_RELOAD_KEYS.chunk);
  });

  window.addEventListener("vite:preloadError", (event) => {
    logRuntimeFault("vite.preloadError", {
      type: event.type,
    });
    hardReloadOnce(RUNTIME_RELOAD_KEYS.vitePreload);
  });
};



export { initGlobalChunkRecovery };
