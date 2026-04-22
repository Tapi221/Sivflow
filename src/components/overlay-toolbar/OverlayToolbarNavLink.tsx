import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import {
  overlayGlassActionButtonActiveClassName,
  overlayGlassActionButtonClassName,
} from "@/components/card/shell/overlaySurfaceClassNames";
import { cn } from "@/lib/utils";

type OverlayToolbarNavLinkProps = {
  to: string;
  label: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
};

export const OverlayToolbarNavLink = ({
  to,
  label,
  active = false,
  className,
  children,
}: OverlayToolbarNavLinkProps) => {
  return (
    <NavLink
      to={to}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        overlayGlassActionButtonClassName,
        "relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(107,95,85,0.28)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        active && overlayGlassActionButtonActiveClassName,
        className,
      )}
    >
      {children}
    </NavLink>
  );
};
