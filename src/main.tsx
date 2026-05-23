import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { QueryClientProvider } from "@tanstack/react-query";

import "katex/dist/katex.min.css";
import "./styles/index.css";
import "@/features/calendar/scroll/weekdayHeaderScrollBridge";

import "@/services/localDB";

import App from "./App";
import { bootstrapApp } from "./bootstrap/bootstrapApp";
import { queryClient } from "./bootstrap/queryClient";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

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
