import "@/services/localDB";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "katex/dist/katex.min.css";
import "./styles/index.css";

import App from "./App";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { initAppRuntime } from "./bootstrap/initAppRuntime";
import { queryClient } from "./bootstrap/queryClient";
import { bootstrapPersistentQueue } from "@/platform/web/bootstrapPersistentQueue";

initAppRuntime();
bootstrapPersistentQueue();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
