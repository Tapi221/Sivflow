import { useEffect, useState } from "react";
import { AccountLockedScreen } from "@/components/security/AccountLockedScreen";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useStartupTasks } from "@/application/startup/useStartupTasks";
import { AppRoutes } from "@web/routing/AppRoutes";
import { isPreviewRouteEnabled } from "@web/routing/previewRouteGuard";
import { LoadingFallback } from "@web-renderer/components/common/LoadingFallback";
import { LoginPage } from "@web-renderer/features/auth/LoginPage";
import { MobileLoginPage } from "@web-renderer/features/auth/MobileLoginPage";



const MOBILE_LOGIN_VIEWPORT_MAX_WIDTH = 767;



const getIsMobileLoginViewport = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth <= MOBILE_LOGIN_VIEWPORT_MAX_WIDTH;
};
const useIsMobileLoginViewport = (): boolean => {
  const [isMobileLoginViewport, setIsMobileLoginViewport] = useState(getIsMobileLoginViewport);
  useEffect(() => {
    const updateIsMobileLoginViewport = () => {
      setIsMobileLoginViewport(getIsMobileLoginViewport());
    };
    updateIsMobileLoginViewport();
    window.addEventListener("resize", updateIsMobileLoginViewport);
    window.addEventListener("orientationchange", updateIsMobileLoginViewport);
    return () => {
      window.removeEventListener("resize", updateIsMobileLoginViewport);
      window.removeEventListener("orientationchange", updateIsMobileLoginViewport);
    };
  }, []);
  return isMobileLoginViewport;
};



const AppContent = () => {
  const { currentUser, loading } = useAuthSession();
  const isMobileLoginViewport = useIsMobileLoginViewport();
  useStartupTasks(currentUser?.uid);
  const isPreviewRoute = isPreviewRouteEnabled();
  if (loading) {
    return <LoadingFallback />;
  }
  if (!currentUser && !isPreviewRoute) {
    return isMobileLoginViewport ? <MobileLoginPage /> : <LoginPage />;
  }
  return (
    <>
      <AccountLockedScreen />
      <AppRoutes />
    </>
  );
};



export { AppContent };
