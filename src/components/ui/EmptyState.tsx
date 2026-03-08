import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** align left instead of centered */
  align?: "left" | "center";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  align = "center",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "h-full w-full flex",
        align === "center" ? "items-center justify-center" : "items-start",
        className,
      )}
    >
      <div
        className={cn(
          "space-y-2",
          align === "center" ? "text-center max-w-xs" : "text-left",
        )}
      >
        {icon ? (
          <div
            className={cn(
              "text-[var(--text-muted,#8a8a8a)]",
              align === "center" ? "flex justify-center" : "",
            )}
          >
            {icon}
          </div>
        ) : null}
        <div>
          <p
            style={{
              fontSize: "var(--font-size-body, 13px)",
              color: "var(--text-secondary, #4b4b4b)",
              fontWeight: 400,
              margin: 0,
            }}
          >
            {title}
          </p>
          {description ? (
            <p
              style={{
                fontSize: "var(--font-size-meta, 12px)",
                color: "var(--text-muted, #8a8a8a)",
                marginTop: 4,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className={cn(align === "center" ? "flex justify-center" : "")}>
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}




