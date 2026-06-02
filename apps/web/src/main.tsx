import "@/runtime/installProductionConsoleFilter";
import "@/runtime/disableNativeTitleTooltips";
import "@platform/desktop/installTauriDesktopBridge";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "katex/dist/katex.min.css";
import "@/styles/index.css";
import "@/features/scroll/schedule/weekdayHeaderScrollBridge";
import "@/services/localDB";
import App from "@web-renderer/App";
import { ErrorBoundary } from "@/components/common/ErrorScreen";
import { renderGoogleOAuthCallback } from "@/integration/google-integration/google.oauth-callback";
import { queryClient } from "@/runtime/queryClient";
import { startAppRuntime } from "@/runtime/startAppRuntime";

if (!renderGoogleOAuthCallback()) {
  startAppRuntime();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
