import type { FloatingSurfaceVariantProps } from "./floating-surface";



type FloatingSurface = NonNullable<FloatingSurfaceVariantProps["surface"]>;
interface FloatingPanelPreset {
  className: string;
  surface: FloatingSurface;
}



const floatingPanelPresets = { menu: { className: "ds-floating-panel__content ds-floating-panel__content--menu", surface: "menuStrong" }, filter: { className: "ds-floating-panel__content ds-floating-panel__content--filter", surface: "filter" } } as const satisfies Record<string, FloatingPanelPreset>;



export { floatingPanelPresets };
