import { BUILD_VERSION } from "@config/build";

export const logBootstrapFault = (
  kind: string,
  detail: Record<string, unknown>,
) => {
  if (typeof window === "undefined") return;

  const payload = {
    kind,
    detail,
    buildVersion: BUILD_VERSION,
    href: window.location.href,
    online: navigator.onLine,
    timestamp: new Date().toISOString(),
  };

  console.error("[Bootstrap Fault]", payload);

  if (!("serviceWorker" in navigator)) return;

  void navigator.serviceWorker.getRegistration().then((registration) => {
    console.error("[Bootstrap Fault:SW]", {
      hasController: Boolean(navigator.serviceWorker.controller),
      scope: registration?.scope,
      activeState: registration?.active?.state ?? null,
      waitingState: registration?.waiting?.state ?? null,
      installingState: registration?.installing?.state ?? null,
    });
  });
};
