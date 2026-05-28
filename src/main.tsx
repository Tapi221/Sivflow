import "@/runtime/installProductionConsoleFilter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "bootstrap/dist/css/bootstrap.min.css";
import "katex/dist/katex.min.css";
import "@/styles/index.css";
import "@/features/scroll/schedule/weekdayHeaderScrollBridge";
import "@/services/localDB";
import App from "./App";
import { startAppRuntime } from "@/runtime/startAppRuntime";
import { queryClient } from "@/runtime/queryClient";
import { ErrorBoundary } from "@/components/common/ErrorScreen";

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
