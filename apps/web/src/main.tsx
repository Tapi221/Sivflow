import "@/styles/index.css";
import "@/services/localDB";
import "@/../apps/web/src/runtime/disableNativeTitleTooltips";
import "@/../apps/web/src/runtime/installProductionConsoleFilter";
import "@platform/desktop/installTauriDesktopBridge";
import "katex/dist/katex.min.css";
import { StrictMode, useEffect, useState } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import { ErrorBoundary } from "@/components/common/ErrorScreen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderGoogleOAuthCallback } from "@/integration/google-integration/google.oauth-callback";

type AppBootstrapState =
  | { status: "loading"; }
  | { status: "ready"; App: ComponentType; }
  | { status: "failed"; message: string; };
type StartupFailureScreenProps = {
  message: string;
};
type SivflowReactRootStore = {
  container: HTMLElement;
  root: Root;
};
declare global {
  interface Window {
    __sivflowReactRootStore?: SivflowReactRootStore;
  }
}

const FIREBASE_ENV_FAILURE_MARKER = "[env] Missing required Firebase env vars";
const STARTUP_FAILURE_TITLE = "起動設定が不足しています";
const STARTUP_FAILURE_DESCRIPTION = "必要な設定を読み込めなかったため、画面を表示できません。";
const FIREBASE_ENV_SETUP_GUIDE = ".env.example を .env.local にコピーして VITE_FIREBASE_* を設定し、dev server を再起動してください。";
const TEST_BYPASS_SEARCH_PARAM = "test_bypass";
const ROOT_ELEMENT_ID = "root";
const ROOT_ELEMENT_MISSING_MESSAGE = "React の描画先 root 要素が見つかりません。";
const REACT_ROOT_UNMOUNT_FAILURE_MESSAGE = "[Startup] 既存 React root の破棄に失敗しました";
const STARTUP_LOGO_STYLE = `
@keyframes sivflow-startup-logo-form {
  0% {
    opacity: 0.04;
    filter: blur(26px) brightness(1.28) saturate(1.08);
    transform: scale(0.985);
  }

  34% {
    opacity: 0.38;
    filter: blur(17px) brightness(1.16) saturate(1.05);
    transform: scale(0.99);
  }

  68% {
    opacity: 0.84;
    filter: blur(6px) brightness(1.06) saturate(1.02);
    transform: scale(0.997);
  }

  100% {
    opacity: 1;
    filter: blur(0) brightness(1) saturate(1);
    transform: scale(1);
  }
}

@keyframes sivflow-startup-ribbons-form {
  0% {
    clip-path: inset(42% 38% 42% 38% round 999px);
  }

  62% {
    clip-path: inset(5% 3% 5% 3% round 96px);
  }

  100% {
    clip-path: inset(0 0 0 0 round 0);
  }
}

.sivflow-startup-logo {
  animation: sivflow-startup-logo-form 1750ms cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: filter, opacity, transform;
}

.sivflow-startup-logo-ribbons {
  animation: sivflow-startup-ribbons-form 1750ms cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-box: fill-box;
  transform-origin: center;
}
`;

const getStartupFailureMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes(FIREBASE_ENV_FAILURE_MARKER)) {
    return `${message}\n\n${FIREBASE_ENV_SETUP_GUIDE}`;
  }

  return message ?? "起動に必要なモジュールの読み込みに失敗しました。";
};

const startAppRuntimeSafely = async (): Promise<void> => {
  try {
    const { startAppRuntime } = await import("@/../apps/web/src/runtime/startAppRuntime");
    startAppRuntime();
  } catch (error) {
    console.warn("[Startup] Runtime initialization failed", error);
  }
};

const isPdfPerformanceStandaloneRoute = (): boolean => {
  if (!import.meta.env.DEV) return false;
  if (window.location.pathname !== "/pdf-performance-test") return false;
  if (new URLSearchParams(window.location.search).get(TEST_BYPASS_SEARCH_PARAM) !== "true") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1";
};

const getReactRootElement = (): HTMLElement => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);

  if (!rootElement) {
    throw new Error(ROOT_ELEMENT_MISSING_MESSAGE);
  }

  return rootElement;
};

const unmountStaleReactRoot = (rootStore: SivflowReactRootStore): void => {
  try {
    rootStore.root.unmount();
  } catch (error) {
    console.warn(REACT_ROOT_UNMOUNT_FAILURE_MESSAGE, error);
  }
};

const getSivflowReactRoot = (): Root => {
  const rootElement = getReactRootElement();
  const rootStore = window.__sivflowReactRootStore;

  if (rootStore?.container === rootElement) {
    return rootStore.root;
  }

  if (rootStore) {
    unmountStaleReactRoot(rootStore);
  }

  const root = createRoot(rootElement);
  window.__sivflowReactRootStore = { container: rootElement, root };

  return root;
};

const StartupLogoMark = () => {
  return (
    <svg className="sivflow-startup-logo h-[236px] w-[236px] overflow-visible" xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Sivflow logo">
      <defs>
        <linearGradient id="sivflowStartupTop" x1="46" y1="258" x2="486" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00142d" />
          <stop offset="0.36" stopColor="#062849" />
          <stop offset="0.58" stopColor="#1f8bc4" />
          <stop offset="0.78" stopColor="#32bff1" />
          <stop offset="1" stopColor="#effcff" />
        </linearGradient>
        <linearGradient id="sivflowStartupMiddle" x1="133" y1="276" x2="428" y2="213" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00142d" />
          <stop offset="0.5" stopColor="#0b355d" />
          <stop offset="0.82" stopColor="#7ecde9" />
          <stop offset="1" stopColor="#f7fdff" />
        </linearGradient>
        <linearGradient id="sivflowStartupBottom" x1="24" y1="466" x2="476" y2="229" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00142d" />
          <stop offset="0.36" stopColor="#062345" />
          <stop offset="0.66" stopColor="#1daee6" />
          <stop offset="0.9" stopColor="#58cef3" />
          <stop offset="1" stopColor="#effcff" />
        </linearGradient>
        <filter id="sivflowStartupShadow" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#001a38" floodOpacity="0.12" />
        </filter>
      </defs>
      <g className="sivflow-startup-logo-ribbons" filter="url(#sivflowStartupShadow)">
        <path fill="url(#sivflowStartupTop)" d="M485 41C468 73 444 99 410 115C396 121 380 122 377 122H273C231 122 180 127 136 157C88 190 62 240 73 277C82 307 111 335 152 352C79 325 38 271 45 204C51 142 88 87 137 60C171 41 211 31 239 31H452C475 31 495 37 485 41Z" />
        <path fill="url(#sivflowStartupMiddle)" d="M138 300C149 268 164 246 194 224C214 210 238 207 251 207H427C409 238 389 263 360 284C333 303 298 302 292 302H141C139 302 138 301 138 300Z" />
        <path fill="url(#sivflowStartupBottom)" d="M466 206C485 252 481 315 463 336C442 388 405 430 348 459C318 474 279 481 210 481H26C25 480 25 478 25 477C46 427 79 397 116 389C126 386 136 385 141 385H259C317 384 369 370 409 326C442 290 461 245 466 206Z" />
      </g>
    </svg>
  );
};

const StartupLoadingScreen = () => {
  return (
    <main className="grid min-h-dvh w-full place-items-center bg-white">
      <style>{STARTUP_LOGO_STYLE}</style>
      <StartupLogoMark />
    </main>
  );
};

const StartupFailureScreen = ({ message }: StartupFailureScreenProps) => {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-white px-6 text-slate-900">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="m-0 text-lg font-semibold">{STARTUP_FAILURE_TITLE}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{STARTUP_FAILURE_DESCRIPTION}</p>
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">{message}</pre>
      </section>
    </main>
  );
};

const AppBootstrap = () => {
  const [state, setState] = useState<AppBootstrapState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    if (isPdfPerformanceStandaloneRoute()) {
      void import("@/routes/PdfPerformanceTest")
        .then((module) => {
          if (!mounted) return;
          setState({ status: "ready", App: module.default });
        })
        .catch((error) => {
          console.error("[Startup] PDF performance route loading failed", error);
          if (!mounted) return;
          setState({ status: "failed", message: getStartupFailureMessage(error) });
        });

      return () => {
        mounted = false;
      };
    }

    void startAppRuntimeSafely();
    void import("@web-renderer/App")
      .then((module) => {
        if (!mounted) return;
        setState({ status: "ready", App: module.default });
      })
      .catch((error) => {
        console.error("[Startup] App module loading failed", error);
        if (!mounted) return;
        setState({ status: "failed", message: getStartupFailureMessage(error) });
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <StartupLoadingScreen />;
  }

  if (state.status === "failed") {
    return <StartupFailureScreen message={state.message} />;
  }

  const LoadedApp = state.App;
  return <LoadedApp />;
};

if (!renderGoogleOAuthCallback()) {
  getSivflowReactRoot().render(
    <StrictMode>
      <ErrorBoundary>
        <TooltipProvider>
          <AppBootstrap />
        </TooltipProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
