import "@/services/localDB";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./styles/index.css";
import "katex/dist/katex.min.css";

import App from "./App";
import { initAppRuntime } from "./bootstrap/initAppRuntime";
import { queryClient } from "./bootstrap/queryClient";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

initAppRuntime();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
