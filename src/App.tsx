import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppContent } from "@/app/AppContent";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { ToastProvider } from "@/contexts/ToastContext";

const App = () => {
  return (
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
  );
};

export default App;
