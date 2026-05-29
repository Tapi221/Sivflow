import { MantineProvider } from "@mantine/core";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import "@mantine/core/styles.css";
import { AppContent } from "./app/AppContent";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { ToastProvider } from "@/contexts/ToastContext";

const App = () => (
  <MantineProvider defaultColorScheme="light">
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <BreadcrumbProvider>
              <Suspense fallback={null}>
                <AppContent />
              </Suspense>
            </BreadcrumbProvider>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  </MantineProvider>
);

export default App;