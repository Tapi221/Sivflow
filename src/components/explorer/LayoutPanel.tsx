import { SurfaceButton } from "@/components/ui/surface-button";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type LayoutMode = "detail" | "list" | "card" | "icon" | "column";

const LayoutDetailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 18H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4 6H4.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M4 12H4.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M4 18H4.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

const LayoutListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10.5 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10.5 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="4" y="15" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const LayoutCardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="6" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M8 13.5H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
  </svg>
);

const LayoutIconGridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="5" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13" y="5" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    <rect x="5" y="13" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13" y="13" width="6" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const LayoutColumnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="16" height="14" rx="2.6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M11 7V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M13 7V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const LayoutPanel = ({ className }: { className?: string }) => {
  const [mode, setMode] = useState<LayoutMode>("detail");

  const options = useMemo(
    () =>
      [
        { value: "detail" as const, label: "詳細", icon: <LayoutDetailIcon /> },
        { value: "list" as const, label: "一覧", icon: <LayoutListIcon /> },
        { value: "card" as const, label: "カード", icon: <LayoutCardIcon /> },
        { value: "icon" as const, label: "アイコン", icon: <LayoutIconGridIcon /> },
        { value: "column" as const, label: "カラム", icon: <LayoutColumnIcon /> },
      ] satisfies ReadonlyArray<{
        value: LayoutMode;
        label: string;
        icon: JSX.Element;
      }>,
    [],
  );

  return (
    <div className={cn("ds-filter-panel flex h-full min-h-0 flex-col", className)}>
      <div className="ds-filter-section ds-floating-panel__section ds-floating-panel__section--dense space-y-2 bg-transparent">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="ds-filter-section__label ds-floating-panel__label">
            レイアウト:
          </span>

          <div className="ds-filter-toggle-group flex items-center gap-1">
            {options.map((opt) => {
              const selected = mode === opt.value;
              return (
                <SurfaceButton
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  surface={selected ? "convexActive" : "concave"}
                  size="xs"
                  title={opt.label}
                  aria-label={opt.label}
                  className={cn(
                    "h-8 w-8 px-0",
                    "rounded-[9px]",
                    "grid place-items-center",
                    "text-[#1a1a1a]",
                  )}
                >
                  {opt.icon}
                </SurfaceButton>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ds-floating-panel__body min-h-0 flex-1 bg-transparent" />
    </div>
  );
};
