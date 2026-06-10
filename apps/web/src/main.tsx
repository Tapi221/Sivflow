/* eslint-disable react-refresh/only-export-components */
import "./runtime/installProductionConsoleFilter";
import "./runtime/disableNativeTitleTooltips";
import "@platform/desktop/installTauriDesktopBridge";
import { StrictMode, useEffect, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "@/styles/index.css";
import "@/services/localDB";
import { ErrorBoundary } from "@/components/common/ErrorScreen";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { renderGoogleOAuthCallback } from "@/integration/google-integration/google.oauth-callback";

type AppBootstrapState =
  | { status: "loading" }
  | { status: "ready"; App: ComponentType }
  | { status: "failed"; message: string };

type StartupFailureScreenProps = {
  message: string;
};

const FIREBASE_ENV_FAILURE_MARKER = "[env] Missing required Firebase env vars";
const STARTUP_LOADING_LABEL = "起動中";
const STARTUP_FAILURE_TITLE = "起動設定が不足しています";
const STARTUP_FAILURE_DESCRIPTION = "必要な設定を読み込めなかったため、画面を表示できません。";
const FIREBASE_ENV_SETUP_GUIDE = ".env.example を .env.local にコピーして VITE_FIREBASE_* を設定し、dev server を再起動してください。";
const TEST_BYPASS_SEARCH_PARAM = "test_bypass";

const getStartupFailureMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes(FIREBASE_ENV_FAILURE_MARKER)) {
    return `${message}\n\n${FIREBASE_ENV_SETUP_GUIDE}`;
  }

  return message || "起動に必要なモジュールの読み込みに失敗しました。";
};

const startAppRuntimeSafely = async (): Promise<void> => {
  try {
    const { startAppRuntime } = await import("./runtime/startAppRuntime");
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

const StartupLoadingScreen = () => <LoadingSpinner className="min-h-dvh w-full bg-white text-slate-400" iconClassName="h-6 w-6" label={STARTUP_LOADING_LABEL} />;

const StartupFailureScreen = ({ message }: StartupFailureScreenProps) => (
  <main className="flex min-h-dvh w-full items-center justify-center bg-white px-6 text-slate-900">
    <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="m-0 text-lg font-semibold">{STARTUP_FAILURE_TITLE}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{STARTUP_FAILURE_DESCRIPTION}</p>
      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">{message}</pre>
    </section>
  </main>
);

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
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <AppBootstrap />
      </ErrorBoundary>
    </StrictMode>,
  );
}
