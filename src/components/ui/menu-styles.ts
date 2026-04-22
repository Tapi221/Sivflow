import type { FloatingSurfaceVariantProps } from "@/components/ui/floating-surface";

type FloatingSurface = NonNullable<FloatingSurfaceVariantProps["surface"]>;

interface FloatingPanelPreset {
  className: string;
  surface: FloatingSurface;
}

export const floatingPanelPresets = {
  menu: {
    className: "ds-floating-panel__content ds-floating-panel__content--menu",
    surface: "menuStrong",
  },
  filter: {
    className: "ds-floating-panel__content ds-floating-panel__content--filter",
    surface: "filter",
  },
} as const satisfies Record<string, FloatingPanelPreset>;

export const glassMenuContentClass = floatingPanelPresets.menu.className;
export const filterPanelContentClass = floatingPanelPresets.filter.className;
