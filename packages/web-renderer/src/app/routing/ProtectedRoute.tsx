import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@/components/common/LoadingFallback";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import { isTestBypassEnabled } from "./testBypass";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { currentUser, loading } = useAuthSession();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser && !isTestBypassEnabled()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};