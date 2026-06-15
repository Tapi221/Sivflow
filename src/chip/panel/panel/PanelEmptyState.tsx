import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelEmptyStateProps {
  icon?: ReactNode;
  message: ReactNode;
  className?: string;
}

const PanelEmptyState = ({ icon, message, className }: PanelEmptyStateProps) => {
  return (
    <div className={cn("ds-filter-empty flex flex-col items-center justify-center py-8 text-center text-xs", className)}>
      {icon !== undefined && <div className="mb-2 opacity-20">{icon}</div>}
      <p>{message}</p>
    </div>
  );
};

export { PanelEmptyState };
