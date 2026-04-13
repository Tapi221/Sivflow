import { BOOTSTRAP_RELOAD_KEYS } from "./constants";
import { logBootstrapFault } from "./logBootstrapFault";
import { toErrorText } from "./errorUtils";
import { hardReloadOnce } from "./reloadGuard";

let started = false;

const applyWaitingWorker = (registration: ServiceWorkerRegistration) => {
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
};

const installUpdateFlow = (registration: ServiceWorkerRegistration) => {
  const installing = registration.installing;
  if (!installing) return;

  installing.addEventListener("statechange", () => {
    if (
      installing.state === "installed" &&
      navigator.serviceWorker.controller
    ) {
      logBootstrapFault("sw.update.installed", {
        scope: registration.scope,
        state: installing.state,
      });
      applyWaitingWorker(registration);
    }
  });
};

const clearDevSwAndCaches = () => {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
      console.log("SW unregistered in dev mode");
    });
  });

  if (!("caches" in window)) return;

  void caches.keys().then((names) => {
    names.forEach((name) => {
      void caches.delete(name);
      console.log("[Cache] Deleted cache:", name);
    });
  });
};

export const initServiceWorkerLifecycle = () => {
  if (
    started ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }
  started = true;

  if (import.meta.env.DEV) {
    clearDevSwAndCaches();
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);

        registration.addEventListener("updatefound", () => {
          installUpdateFlow(registration);
        });

        if (registration.waiting) {
          applyWaitingWorker(registration);
        }

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          hardReloadOnce(BOOTSTRAP_RELOAD_KEYS.swController);
        });

        installUpdateFlow(registration);
        void registration.update();

        window.setInterval(
          () => {
            void registration.update();
          },
          1000 * 60 * 60,
        );
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
        logBootstrapFault("sw.register.error", {
          registrationError: toErrorText(registrationError),
        });
      });
  });
};
