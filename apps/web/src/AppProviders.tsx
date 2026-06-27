import "@mantine/core/styles.css";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@web-renderer/contexts/ToastContext";
import { AppSonnerToaster } from "@/components/notifications/AppSonnerToaster";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { AuthProvider } from "@/contexts/AuthProvider";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";



type AppProvidersProps = {
  children: ReactNode;
};



const AppProviders = ({ children }: AppProvidersProps) => {
  return (
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
};



export { AppProviders };


export type { AppProvidersProps };
