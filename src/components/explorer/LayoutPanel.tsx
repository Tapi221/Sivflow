import { SurfaceButton } from "@/components/ui/surface-button";
import {
  type ExplorerLayoutMode,
  useExplorerStore,
} from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const LayoutListIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="5"
      width="4"
      height="4"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M10.5 7H20"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect
      x="4"
      y="10"
      width="4"
      height="4"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M10.5 12H20"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect
      x="4"
      y="15"
      width="4"
      height="4"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M10.5 17H20"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const LayoutCardIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="6"
      width="14"
      height="12"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M8 10H16"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8 13.5H14"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

const LayoutIconGridIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="5"
      y="5"
      width="6"
      height="6"
      rx="1.6"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <rect
      x="13"
      y="5"
      width="6"
      height="6"
      rx="1.6"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <rect
      x="5"
      y="13"
      width="6"
      height="6"
      rx="1.6"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <rect
      x="13"
      y="13"
      width="6"
      height="6"
      rx="1.6"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

const LayoutColumnIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="5"
      width="16"
      height="14"
      rx="2.6"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M11 7V17"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M13 7V17"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const LayoutPanel = ({ className }: { className?: string }) => {
  const mode = useExplorerStore((state) => state.explorerLayoutMode);
  const setMode = useExplorerStore((state) => state.setExplorerLayoutMode);

  const options = useMemo(
    () =>
      [
        { value: "list" as const, label: "一覧", icon: <LayoutListIcon /> },
        { value: "card" as const, label: "カード", icon: <LayoutCardIcon /> },
        {
          value: "icon" as const,
          label: "アイコン",
          icon: <LayoutIconGridIcon />,
        },
        {
          value: "column" as const,
          label: "カラム",
          icon: <LayoutColumnIcon />,
        },
      ] satisfies ReadonlyArray<{
        value: ExplorerLayoutMode;
        label: string;
        icon: JSX.Element;
      }>,
    [],
  );

  return (
    <div
      className={cn("ds-filter-panel flex h-full min-h-0 flex-col", className)}
    >
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
                  aria-pressed={selected}
                  className={cn(
                    "h-8 w-8 px-0",
                    "rounded-[9px]",
                    "grid place-items-center",
                    selected ? "[&>svg]:opacity-95" : "[&>svg]:opacity-72",
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
