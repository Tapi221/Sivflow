type BuildImportMetaEnv = ImportMeta["env"] & {
  readonly VITE_BUILD_VERSION?: string;
};



const env = import.meta.env as BuildImportMetaEnv;
const BUILD_VERSION = env.VITE_BUILD_VERSION ?? import.meta.env.MODE;



const logRuntimeFault = (kind: string, detail: Record<string, unknown>) => {
  if (typeof window === "undefined") return;

  const payload = {
    kind,
    detail,
    buildVersion: BUILD_VERSION,
    href: window.location.href,
    online: navigator.onLine,
    timestamp: new Date().toISOString(),
  };

  console.error("[Runtime Fault]", payload);

  if (!("serviceWorker" in navigator)) return;

  void navigator.serviceWorker.getRegistration().then((registration) => {
    console.error("[Runtime Fault:SW]", {
      hasController: Boolean(navigator.serviceWorker.controller),
      scope: registration?.scope,
      activeState: registration?.active?.state ?? null,
      waitingState: registration?.waiting?.state ?? null,
      installingState: registration?.installing?.state ?? null,
    });
  });
};



export { logRuntimeFault };
