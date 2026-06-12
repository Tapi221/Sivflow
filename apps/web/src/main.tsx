import "@/styles/index.css";
import "@/services/localdb";
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
const STARTUP_FAILURE_TITLE = "起動に失敗しました";
const STARTUP_FAILURE_DESCRIPTION = "アプリの読み込み中にエラーが発生しました。";
const FIREBASE_ENV_SETUP_GUIDE = ".env.example を .env.local にコピーして VITE_FIREBASE_* を設定し、dev server を再起動してください。";
const TEST_BYPASS_SEARCH_PARAM = "test_bypass";
const ROOT_ELEMENT_ID = "root";
const ROOT_ELEMENT_MISSING_MESSAGE = "React の描画先 root 要素が見つかりません。";
const REACT_ROOT_UNMOUNT_FAILURE_MESSAGE = "[Startup] 既存 React root の破棄に失敗しました";
const STARTUP_LOGO_STYLE = `
  width: 56px;
  height: 56px;
  display: block;
  margin: 0 auto 16px;
`;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
const isFirebaseEnvFailure = (error: unknown): boolean => getErrorMessage(error).includes(FIREBASE_ENV_FAILURE_MARKER);
const renderStartupFailure = (message: string) => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  rootElement.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f5ef;color:#2f2f2f;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;box-sizing:border-box;">
      <section style="max-width:520px;width:100%;border:1px solid #e5ded2;background:#fff;border-radius:20px;padding:28px;box-shadow:0 18px 60px rgba(48,43,34,.12);">
        <img src="/icon.svg" alt="Sivflow" style="${STARTUP_LOGO_STYLE}" />
        <h1 style="font-size:20px;margin:0 0 8px;font-weight:700;">${STARTUP_FAILURE_TITLE}</h1>
        <p style="font-size:14px;line-height:1.7;margin:0 0 14px;color:#6a6257;">${STARTUP_FAILURE_DESCRIPTION}</p>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#f7f5ef;border-radius:12px;padding:12px;font-size:12px;line-height:1.6;color:#4b4338;">${message}</pre>
      </section>
    </main>
  `;
};
const resolveStartupFailureMessage = (error: unknown): string => {
  const message = getErrorMessage(error);
  if (isFirebaseEnvFailure(error)) return `${message}\n\n${FIREBASE_ENV_SETUP_GUIDE}`;
  return message;
};
const StartupFailureScreen = ({ message }: StartupFailureScreenProps) => (
  <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-6 text-[#2f2f2f]">
    <section className="w-full max-w-[520px] rounded-[20px] border border-[#e5ded2] bg-white p-7 shadow-[0_18px_60px_rgba(48,43,34,0.12)]">
      <img src="/icon.svg" alt="Sivflow" className="mx-auto mb-4 h-14 w-14" />
      <h1 className="mb-2 text-[20px] font-bold">{STARTUP_FAILURE_TITLE}</h1>
      <p className="mb-3 text-[14px] leading-7 text-[#6a6257]">{STARTUP_FAILURE_DESCRIPTION}</p>
      <pre className="whitespace-pre-wrap break-words rounded-[12px] bg-[#f7f5ef] p-3 text-[12px] leading-6 text-[#4b4338]">{message}</pre>
    </section>
  </main>
);
const loadApp = async (): Promise<ComponentType> => {
  const module = await import("@/App");
  return module.default;
};
const ensureRootElement = (): HTMLElement => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) throw new Error(ROOT_ELEMENT_MISSING_MESSAGE);
  return rootElement;
};
const unmountExistingRoot = (): void => {
  const existingStore = window.__sivflowReactRootStore;
  if (!existingStore) return;

  try {
    existingStore.root.unmount();
  } catch (error) {
    console.warn(REACT_ROOT_UNMOUNT_FAILURE_MESSAGE, error);
  } finally {
    delete window.__sivflowReactRootStore;
  }
};
const createSivflowRoot = (container: HTMLElement): Root => {
  const root = createRoot(container);
  window.__sivflowReactRootStore = { container, root };
  return root;
};
const AppBootstrap = () => {
  const [state, setState] = useState<AppBootstrapState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    loadApp()
      .then((App) => {
        if (cancelled) return;
        setState({ status: "ready", App });
      })
      .catch((error) => {
        console.error("[Startup] App module loading failed", error);
        if (cancelled) return;
        setState({ status: "failed", message: resolveStartupFailureMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return null;
  if (state.status === "failed") return <StartupFailureScreen message={state.message} />;

  const App = state.App;
  return <App />;
};
const mountApp = async (): Promise<void> => {
  const rootElement = ensureRootElement();
  unmountExistingRoot();
  const root = createSivflowRoot(rootElement);

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <TooltipProvider>
          <AppBootstrap />
        </TooltipProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
};

try {
  if (!renderGoogleOAuthCallback()) {
    void mountApp().catch((error) => {
      console.error("[Startup] Runtime initialization failed", error);
      renderStartupFailure(resolveStartupFailureMessage(error));
    });
  }
} catch (error) {
  console.error("[Startup] Runtime initialization failed", error);
  renderStartupFailure(resolveStartupFailureMessage(error));
}
