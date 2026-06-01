import { MantineProvider } from "@mantine/core";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import "@mantine/core/styles.css";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { AppSonnerToaster } from "@/components/notifications/AppSonnerToaster";
import { AuthProvider } from "@/contexts/AuthProvider";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { ToastProvider } from "../contexts/ToastContext";

type AppProvidersProps = {
  children: ReactNode;
};

const AppProviders = ({ children }: AppProvidersProps) => (
  <MantineProvider defaultColorScheme="light">
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <BreadcrumbProvider>
              <Suspense fallback={null}>{children}</Suspense>
            </BreadcrumbProvider>
          </BrowserRouter>
          <AppSonnerToaster />
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  </MantineProvider>
);

export { AppProviders };
export type { AppProvidersProps };
