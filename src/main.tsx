import "@/services/localDB";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "katex/dist/katex.min.css";
import "./styles/index.css";

import App from "./App";
import { bootstrapApp } from "./bootstrap/bootstrapApp";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { queryClient } from "./bootstrap/queryClient";

bootstrapApp();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
