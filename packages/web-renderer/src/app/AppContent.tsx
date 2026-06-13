import { useEffect, useState } from "react";
import { AppRoutes } from "@web-renderer/app/routing/AppRoutes";
import { getDevStandaloneRouteElement } from "@web-renderer/app/routing/DevRoutes";
import { isTestBypassEnabled } from "@web-renderer/app/routing/testBypass";
import { LoginPage } from "@web-renderer/features/auth/LoginPage";
import { MobileLoginPage } from "@web-renderer/features/auth/MobileLoginPage";
import { useStartupTasks } from "@/application/startup/useStartupTasks";
import { LoadingFallback } from "@/components/common/LoadingFallback";
import { AccountLockedScreen } from "@/components/security/AccountLockedScreen";
import { useAuthSession } from "@/contexts/auth/useAuthSession";



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

  const isTestBypass = isTestBypassEnabled();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser && !isTestBypass) {
    return isMobileLoginViewport ? <MobileLoginPage /> : <LoginPage />;
  }

  const devStandaloneRouteElement = getDevStandaloneRouteElement(isTestBypass);
  if (devStandaloneRouteElement) {
    return devStandaloneRouteElement;
  }

  return (
    <>
      <AccountLockedScreen />
      <AppRoutes />
    </>
  );
};



export { AppContent };
