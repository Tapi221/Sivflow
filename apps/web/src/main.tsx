import "@/styles/index.css";
import "@/services/localdb";
import "@web/runtime/disableNativeTitleTooltips";
import "@web/runtime/installProductionConsoleFilter";
import "@platform/desktop/installTauriDesktopBridge";
import "katex/dist/katex.min.css";
import { StrictMode } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@web-renderer/chip/panel/toolchip/Tooltip.Editor";
import { ErrorBoundary } from "@web-renderer/components/common/ErrorScreen";
import { AppProviders } from "@web/AppProviders";
import { WebApp } from "@web/WebApp";
import { renderGoogleOAuthCallback } from "@/integration/google-integration/google.oauth-callback";



type SivflowReactRootStore = {
  container: HTMLElement;
  root: Root;
};
declare global {
  interface Window {
    __sivflowReactRootStore?: SivflowReactRootStore;
  }
}



const ROOT_ELEMENT_ID = "root";
const ROOT_ELEMENT_MISSING_MESSAGE = "React の描画先 root 要素が見つかりません。";
const REACT_ROOT_UNMOUNT_FAILURE_MESSAGE = "[Startup] 既存 React root の破棄に失敗しました";



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
const mountApp = (): void => {
  const rootElement = ensureRootElement();
  unmountExistingRoot();
  const root = createSivflowRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <TooltipProvider>
          <AppProviders>
            <WebApp />
          </AppProviders>
        </TooltipProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
};
if (!renderGoogleOAuthCallback()) {
  mountApp();
}
