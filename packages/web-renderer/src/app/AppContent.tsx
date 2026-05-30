import { AccountLockedScreen } from "@/components/security/AccountLockedScreen";
import { LoadingFallback } from "@/components/common/LoadingFallback";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import { useStartupTasks } from "@/application/startup/useStartupTasks";
import { LoginPage } from "@web-renderer/features/auth/LoginPage";
import { AppRoutes } from "./routing/AppRoutes";
import { getDevStandaloneRouteElement } from "./routing/DevRoutes";
import { isTestBypassEnabled } from "./routing/testBypass";

export const AppContent = () => {
  const { currentUser, loading } = useAuthSession();

  useStartupTasks(currentUser?.uid);

  const isTestBypass = isTestBypassEnabled();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser && !isTestBypass) {
    return <LoginPage />;
  }

  const devStandaloneRouteElement = getDevStandaloneRouteElement(isTestBypass);
  if (devStandaloneRouteElement) {
    return <>{devStandaloneRouteElement}</>;
  }

  return (
    <>
      <AccountLockedScreen />
      <AppRoutes />
    </>
  );
};
