import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@web-renderer/components/common/LoadingFallback";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { isPreviewRouteEnabled } from "@web/routing/previewRouteGuard";



type ProtectedRouteProps = {
  children: ReactNode;
};



const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuthSession();
  if (loading) {
    return <LoadingFallback />;
  }
  if (!currentUser && !isPreviewRouteEnabled()) {
    return <Navigate to="/" replace />;
  }
  return children;
};



export { ProtectedRoute };


export type { ProtectedRouteProps };
